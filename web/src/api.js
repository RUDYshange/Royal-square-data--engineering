// One place that knows how to reach the pipeline.
//
// In `npm run dev` the Vite proxy forwards these paths to :8000.
// In the built app FastAPI serves both the files and the API,
// so relative paths work with no configuration at all.
//
// ── Anti-pile-up guarantees ─────────────────────────────────────────
// Polling once stormed the API (2,666 queued requests, 16 s latencies).
// The fetch layer now enforces two invariants:
//
// 1. DEDUP — a GET issued while an identical one is still in flight
//    returns that in-flight promise. Two components (or two poll ticks)
//    landing together cost one round trip, not two.
//
// 2. STALE ABORT — a request in flight longer than STALE_MS is assumed
//    stuck (hung server, collapsed queue). The next caller for that path
//    aborts it and starts fresh, so a stuck request delays data by at
//    most one staleness window and its socket is freed immediately.
//    Aborts reject with an `AbortError`, which usePolling treats as
//    "keep showing last-good data", never as an outage.
const BASE = import.meta.env?.VITE_API_BASE ?? ''

export const STALE_MS = Number(import.meta.env?.VITE_API_STALE_MS) || 8000

// ── session token ────────────────────────────────────────────────────
const TOKEN_KEY = 'nm_session'
export const session = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

async function httpError(res, path) {
  let detail = `${path} returned ${res.status}`
  try {
    const body = await res.json()
    if (body?.detail) detail = body.detail
  } catch { /* non-JSON error body */ }
  const err = new Error(detail)
  err.status = res.status
  return err
}

// Shared GET implementation with dedup + stale-abort. `headers` (and the
// dedup key) include the Authorization header so authed and anon GETs to
// the same path never share each other's cache entry.
const inflight = new Map()
function dedupGet(path, headers) {
  const key = headers?.Authorization ? path + '|' + headers.Authorization : path
  const current = inflight.get(key)

  // 1. Share a healthy in-flight request.
  if (current && Date.now() - current.startedAt < STALE_MS) {
    return current.promise
  }

  // 2. Replace a stale one — aborting frees its socket and queue slot.
  if (current) current.controller.abort()

  const controller = new AbortController()
  const entry = { controller, startedAt: Date.now(), promise: null }
  entry.promise = (async () => {
    try {
      const res = await fetch(BASE + path, { signal: controller.signal, headers })
      if (!res.ok) throw await httpError(res, path)
      return await res.json()
    } finally {
      if (inflight.get(key) === entry) inflight.delete(key)
    }
  })()

  inflight.set(key, entry)
  return entry.promise
}

function get(path, { auth = false } = {}) {
  if (!auth) return dedupGet(path)
  const token = session.get()
  if (!token) {
    return Promise.reject(Object.assign(new Error('no session'), { name: 'AuthError' }))
  }
  return dedupGet(path, { Authorization: `Bearer ${token}` })
}

// Authenticated JSON writes (POST/PATCH/DELETE). Never deduped — writes are
// not replayed or shared; each call is one real request.
async function send(path, method, body) {
  const token = session.get()
  if (!token) {
    return Promise.reject(Object.assign(new Error('no session'), { name: 'AuthError' }))
  }
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) throw await httpError(res, path)
  return res.status === 204 ? null : res.json()
}

// JSON POST. Kept outside the dedup map: writes are never shared/replayed.
async function post(path, body) {
  const headers = { 'Content-Type': 'application/json' }
  // Attach the session token on authenticated writes; /auth/login itself
  // is the one write that must go out bare.
  const token = session.get()
  if (token && path !== '/auth/login') headers.Authorization = `Bearer ${token}`

  const res = await fetch(BASE + path, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!res.ok) throw await httpError(res, path)
  return res.json()
}

export const api = {
  health:      ()   => get('/health'),
  pipeline:    ()   => get('/realtime/claims/pipeline'),
  openClaims:  (n=6)=> get(`/realtime/claims/open?limit=${n}`),
  lossRatio:   ()   => get('/analytics/loss-ratio'),
  freshness:   ()   => get('/analytics/freshness'),
  client:      (id) => get(`/analytics/clients/${id}`),
  login:       (email, password) => post('/auth/login', { email, password }),
  me:          ()   => get('/auth/me', { auth: true }),

  // Operator directory (JWT required; writes need the ops_lead role server-side).
  users:      (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString()
    return get(`/users${qs ? '?' + qs : ''}`, { auth: true })
  },
  user:       (id)   => get(`/users/${id}`, { auth: true }),
  createUser: (body) => send('/users', 'POST', body),
  updateUser: (id, body) => send(`/users/${id}`, 'PATCH', body),
  deleteUser: (id)   => send(`/users/${id}`, 'DELETE'),

  // Policyholder directory (same RBAC contract as /users).
  clients:      (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString()
    return get(`/clients${qs ? '?' + qs : ''}`, { auth: true })
  },
  clientProfile: (id)   => get(`/clients/${id}`, { auth: true }),
  createClient: (body)  => send('/clients', 'POST', body),
  updateClient: (id, body) => send(`/clients/${id}`, 'PATCH', body),
  deleteClient: (id)    => send(`/clients/${id}`, 'DELETE'),
}

// ── formatting, South African conventions ──
export const zar = n =>
  n == null ? '—' : 'R ' + Number(n).toLocaleString('en-ZA', { maximumFractionDigits: 0 })

export const num = n =>
  n == null ? '—' : Number(n).toLocaleString('en-ZA', { maximumFractionDigits: 0 })

export const pct = n =>
  n == null ? '—' : (Number(n) * 100).toFixed(1) + '%'
