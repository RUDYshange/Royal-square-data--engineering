import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, zar, num, pct } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import ClientLookup from '../components/ClientLookup.jsx'
import { Card, Tag, Empty } from '../components/Primitives.jsx'
import { Icon } from '../components/Icons.jsx'

// ── vocabularies ──────────────────────────────────────────────────────
const RISK_CHIP = {
  low:      'bg-blue-50 text-blue-700',
  moderate: 'bg-blue-50 text-blue-700',
  high:     'bg-blue-50 text-blue-900',
}
const PROVINCES = ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape',
  'Free State', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape']
const RISKS = ['low', 'moderate', 'high']

const initials = c => ((c?.first_name?.[0] ?? '?') + (c?.last_name?.[0] ?? '')).toUpperCase()
const field = 'w-full px-3 py-2 rounded-lg bg-canvas border border-rule text-body-md text-ink focus:outline-none focus:border-live transition-colors'

// ── create / edit drawer ──────────────────────────────────────────────
function ClientFormModal({ initial, onClose, onSaved }) {
  const editing = !!initial?.client_id
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    first_name: initial?.first_name ?? '',
    last_name: initial?.last_name ?? '',
    email: initial?.email ?? '',
    province: initial?.province ?? 'Gauteng',
    risk_profile: initial?.risk_profile ?? 'moderate',
    id_number: '',
  })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      const body = {
        first_name: form.first_name, last_name: form.last_name,
        email: form.email || null, province: form.province,
        risk_profile: form.risk_profile,
        ...(form.id_number ? { id_number: form.id_number } : {}),
      }
      if (editing) await api.updateClient(initial.client_id, body)
      else await api.createClient(body)
      onSaved(editing ? `${form.first_name} ${form.last_name} updated` : `${form.first_name} ${form.last_name} onboarded`)
    } catch (err) {
      setError(err.message || 'Save failed')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-spruce/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full w-full max-w-xl bg-white shadow-sheet flex flex-col">
        <div className="px-space-lg py-space-md bg-canvas border-b border-rule flex items-center justify-between shrink-0">
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-xl bg-spruce text-white flex items-center justify-center shadow-sm">
              <Icon name={editing ? 'manage_accounts' : 'person_add'} size={20} />
            </div>
            <div>
              <div className="text-headline-md text-ink leading-tight">
                {editing ? 'Edit Policyholder' : 'Onboard New Policyholder'}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-code-sm font-mono text-live font-bold">
                  {editing ? `CLIENT-${initial.client_id}` : 'NEW-ENTRY'}
                </span>
                {editing && (
                  <span className={`px-1.5 py-0.5 rounded text-label-caps uppercase font-bold ${RISK_CHIP[initial.risk_profile]}`}>
                    {initial.risk_profile} risk
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white border border-rule text-ink-3 hover:text-ink flex items-center justify-center">
            <Icon name="close" size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto p-space-lg space-y-space-lg">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
              <Icon name="error" size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-space-md">
            <div className="text-label-caps text-ink-3 uppercase tracking-wider">Identity (POPIA-minimal)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
              <label className="flex flex-col gap-1">
                <span className="text-label-md text-ink">First Name *</span>
                <input required minLength={1} maxLength={80} value={form.first_name} onChange={set('first_name')} className={field} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-label-md text-ink">Last Name *</span>
                <input required minLength={1} maxLength={80} value={form.last_name} onChange={set('last_name')} className={field} />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-label-md text-ink">Email</span>
                <input type="email" value={form.email ?? ''} onChange={set('email')} className={field} />
              </label>
              {!editing && (
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-label-md text-ink">RSA ID Number <span className="text-ink-3 font-normal">(optional — stored as a SHA-256 hash, never raw)</span></span>
                  <input value={form.id_number} onChange={set('id_number')} minLength={6} maxLength={40} className={`${field} font-mono`} />
                </label>
              )}
            </div>
          </div>

          <div className="space-y-space-md">
            <div className="text-label-caps text-ink-3 uppercase tracking-wider">Jurisdiction & Underwriting</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
              <label className="flex flex-col gap-1">
                <span className="text-label-md text-ink">Province *</span>
                <select value={form.province} onChange={set('province')} className={field}>
                  {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-label-md text-ink">Risk Profile *</span>
                <select value={form.risk_profile} onChange={set('risk_profile')} className={field}>
                  {RISKS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="p-space-md rounded-xl bg-canvas border border-rule text-code-sm font-mono text-ink-3 flex items-start gap-2">
            <Icon name="policy" size={16} className="mt-0.5 shrink-0 text-live" />
            <span>POPIA: ID numbers are hashed before storage and never leave the OLTP layer raw. Writes are attributed to your JWT identity and stream through CDC to every derived layer.</span>
          </div>

          <div className="flex items-center justify-end gap-space-sm pt-space-md border-t border-rule sticky bottom-0 bg-white">
            <button type="button" onClick={onClose}
              className="px-space-md py-2 rounded-lg bg-white border border-rule-strong text-ink text-label-md shadow-sm hover:bg-canvas">Cancel</button>
            <button type="submit" disabled={busy}
              className="px-space-lg py-2 rounded-lg bg-spruce hover:bg-spruce-hover text-white text-label-md shadow-md disabled:opacity-70 flex items-center gap-2">
              {busy ? <><span className="w-2 h-2 rounded-full bg-blue-300 animate-pulse" />Saving…</>
                    : <><Icon name="save" size={16} />{editing ? 'Save Changes' : 'Create Client'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── profile drawer ────────────────────────────────────────────────────
function ProfileDrawer({ clientId, onClose, onEdit, isLead }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setData(null); setError(null)
    api.clientProfile(clientId)
      .then(d => { if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [clientId])

  const STAGE_CHIP = {
    lodged: 'bg-blue-50 text-blue-700', assessing: 'bg-blue-50 text-blue-700',
    approved: 'bg-blue-50 text-blue-700', rejected: 'bg-blue-50 text-blue-900',
    paid: 'bg-blue-50 text-blue-700',
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-spruce/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full w-full max-w-xl bg-white shadow-sheet flex flex-col">
        <div className="px-space-lg py-space-md bg-canvas border-b border-rule flex items-center justify-between shrink-0">
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="w-10 h-10 rounded-xl bg-spruce text-blue-300 flex items-center justify-center text-label-md font-bold shrink-0">
              {initials(data?.client)}
            </div>
            <div className="min-w-0">
              <div className="text-headline-md text-ink leading-tight truncate">
                {data?.client?.full_name ?? `Client ${clientId}`}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-code-sm font-mono text-live font-bold">CLIENT-{clientId}</span>
                {data?.client && (
                  <span className={`px-1.5 py-0.5 rounded text-label-caps uppercase font-bold ${RISK_CHIP[data.client.risk_profile]}`}>
                    {data.client.risk_profile} risk
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isLead && data && (
              <button onClick={() => onEdit(data.client)}
                className="px-space-md py-1.5 rounded-lg bg-spruce text-white text-label-md shadow-sm hover:bg-spruce-hover flex items-center gap-1.5">
                <Icon name="edit_square" size={14} />Edit
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white border border-rule text-ink-3 hover:text-ink flex items-center justify-center">
              <Icon name="close" size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-space-lg space-y-space-lg">
          {error && <div className="p-3 rounded-lg bg-blue-50 text-blue-900 text-body-md">{error}</div>}
          {!data && !error && <div className="py-10 text-center text-ink-3 text-body-md">Loading profile…</div>}

          {data && (
            <>
              {/* totals strip */}
              <div className="grid grid-cols-3 gap-space-md">
                {[
                  { label: 'Lifetime premium', value: zar(data.totals.lifetime_premium) },
                  { label: 'Active policies', value: num(data.totals.active_policies) },
                  { label: 'Open claims', value: num(data.totals.open_claims) },
                ].map(t => (
                  <div key={t.label} className="p-space-md rounded-xl bg-canvas border border-rule">
                    <div className="text-label-caps text-ink-3 uppercase tracking-wider">{t.label}</div>
                    <div className="text-headline-lg text-ink mt-1 tabular">{t.value}</div>
                  </div>
                ))}
              </div>

              {/* contact */}
              <div className="p-space-md rounded-xl bg-canvas border border-rule flex items-center gap-space-md text-body-md text-ink-2">
                <Icon name="mail" size={16} className="text-ink-3" />
                {data.client.email || <span className="text-ink-3">No email on file</span>}
                <span className="mx-1 text-rule">|</span>
                <Icon name="location_city" size={16} className="text-ink-3" />
                {data.client.province}
              </div>

              {/* policies */}
              <div>
                <div className="text-label-caps text-ink-3 uppercase tracking-wider mb-space-sm">Policies ({data.policies.length})</div>
                {data.policies.length ? (
                  <div className="rounded-xl border border-rule overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-canvas text-label-caps text-ink-3 uppercase tracking-wider">
                          <th className="py-2 px-3">Policy</th>
                          <th className="py-2 px-3">Premium</th>
                          <th className="py-2 px-3">Claims</th>
                          <th className="py-2 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rule">
                        {data.policies.map(p => (
                          <tr key={p.policy_id} className="text-body-md">
                            <td className="py-2.5 px-3 font-mono text-code-sm text-ink">{p.policy_number}</td>
                            <td className="py-2.5 px-3 font-mono tabular">{zar(p.premium_amount)}</td>
                            <td className="py-2.5 px-3 tabular">{p.claim_count}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-label-caps uppercase font-bold ${
                                p.status === 'active' ? 'bg-blue-50 text-blue-700' : 'bg-surface-dim/60 text-ink-3'}`}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-space-md rounded-xl bg-canvas border border-dashed border-rule-strong text-body-md text-ink-3 text-center">
                    No policies yet — this client has no coverage in force.
                  </div>
                )}
              </div>

              {/* recent claims */}
              {data.claims.length > 0 && (
                <div>
                  <div className="text-label-caps text-ink-3 uppercase tracking-wider mb-space-sm">Recent claims (latest 10)</div>
                  <div className="rounded-xl border border-rule overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-canvas text-label-caps text-ink-3 uppercase tracking-wider">
                          <th className="py-2 px-3">Claim</th>
                          <th className="py-2 px-3">Policy</th>
                          <th className="py-2 px-3">Amount</th>
                          <th className="py-2 px-3">Stage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rule">
                        {data.claims.map(c => (
                          <tr key={c.claim_id} className="text-body-md">
                            <td className="py-2.5 px-3 font-mono text-code-sm">#{c.claim_id}</td>
                            <td className="py-2.5 px-3 font-mono text-code-sm">{c.policy_number}</td>
                            <td className="py-2.5 px-3 font-mono tabular">{zar(c.claim_amount)}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-label-caps uppercase font-bold ${STAGE_CHIP[c.stage]}`}>
                                {c.stage}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* batch enrichment note */}
              <div className="p-space-md rounded-xl bg-canvas border border-rule text-code-sm font-mono text-ink-3 flex items-center gap-2">
                <Icon name="database" size={14} className="text-live shrink-0" />
                {data.mart
                  ? `Batch mart: ${data.mart.client_segment ?? '—'} · loss ratio ${pct(data.mart.loss_ratio)}`
                  : 'Batch mart: not built yet — profile served from OLTP (source: postgres:oltp)'}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── the page ──────────────────────────────────────────────────────────
export default function Clients() {
  const { user: me } = useAuth()
  const isLead = me?.role === 'ops_lead'
  const PAGE = 25

  const [rows, setRows] = useState(null)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [provinceF, setProvinceF] = useState('all')
  const [riskF, setRiskF] = useState('all')
  const [page, setPage] = useState(0)
  const [drawer, setDrawer] = useState(null)        // 'new' | client
  const [profileId, setProfileId] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [toast, setToast] = useState(null)

  const load = useCallback(async () => {
    try {
      const res = await api.clients({
        q: search || undefined,
        province: provinceF !== 'all' ? provinceF : undefined,
        risk_profile: riskF !== 'all' ? riskF : undefined,
        limit: PAGE, offset: page * PAGE,
      })
      setRows(res.clients ?? [])
      setTotal(res.count ?? 0)
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to load clients')
    }
  }, [search, provinceF, riskF, page])

  useEffect(() => { load() }, [load])

  const stats = useMemo(() => ({
    pages: Math.max(1, Math.ceil(total / PAGE)),
    showing: rows?.length ?? 0,
  }), [total, rows])

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2600) }

  async function onDelete(client) {
    try {
      await api.deleteClient(client.client_id)
      setConfirmDelete(null)
      setProfileId(null)
      showToast(`${client.full_name} and all related policies deleted`)
      load()
    } catch (err) {
      setConfirmDelete(null)
      showToast(err.message)
    }
  }

  return (
    <div className="space-y-space-lg">
      {/* header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">
        <div className="flex flex-col gap-1 max-w-2xl">
          <div className="flex items-center gap-space-sm">
            <h1 className="text-display-hero text-ink tracking-tight">Policyholder Directory</h1>
            <span className="px-2 py-0.5 rounded-full bg-canvas text-ink-3 font-mono text-code-sm">OLTP · CDC source</span>
          </div>
          <p className="text-body-md text-ink-3">
            {num(total)} policyholders in the operational store. Writes here stream through
            Debezium into the pipeline — the demo of source-to-screen.
          </p>
        </div>
        {isLead && (
          <button onClick={() => setDrawer('new')}
            className="inline-flex items-center gap-2 px-space-lg py-2 rounded-lg bg-spruce hover:bg-spruce-hover text-white text-label-md shadow-md self-start lg:self-auto">
            <Icon name="person_add" size={18} />
            Onboard Client
          </button>
        )}
      </div>

      {/* filter bar */}
      <div className="bg-white border border-rule rounded-xl shadow-card p-space-md flex flex-col lg:flex-row items-stretch lg:items-center gap-space-md">
        <div className="relative flex-1">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search by name or email…"
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-canvas border border-rule text-body-md text-ink placeholder:text-ink-3 focus:outline-none focus:border-live" />
        </div>
        <div className="flex items-center flex-wrap gap-space-sm">
          <select value={provinceF} onChange={e => { setProvinceF(e.target.value); setPage(0) }}
            className="px-3 py-2 rounded-lg bg-canvas border border-rule text-body-md text-ink focus:outline-none focus:border-live">
            <option value="all">All Provinces</option>
            {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={riskF} onChange={e => { setRiskF(e.target.value); setPage(0) }}
            className="px-3 py-2 rounded-lg bg-canvas border border-rule text-body-md text-ink focus:outline-none focus:border-live">
            <option value="all">All Risk Profiles</option>
            {RISKS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* directory table */}
      <div className="bg-white border border-rule rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-canvas text-label-caps text-ink-3 uppercase tracking-wider border-b border-rule">
                <th className="py-3 px-4">Policyholder</th>
                <th className="py-3 px-4">Province</th>
                <th className="py-3 px-4">Risk</th>
                <th className="py-3 px-4">Policies</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {rows === null && !error && (
                <tr><td colSpan={5} className="py-10 text-center text-body-md text-ink-3">Loading directory…</td></tr>
              )}
              {error && (
                <tr><td colSpan={5} className="py-10 text-center text-body-md text-danger">{error}</td></tr>
              )}
              {rows?.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-center text-body-md text-ink-3">No policyholders match the current filters.</td></tr>
              )}
              {rows?.map(c => (
                <tr key={c.client_id} className="hover:bg-canvas/60 transition-colors group cursor-pointer"
                    onClick={() => setProfileId(c.client_id)}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-space-sm">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-label-md shadow-sm shrink-0 ${
                        c.risk_profile === 'high' ? 'bg-blue-50 text-blue-900'
                        : c.risk_profile === 'moderate' ? 'bg-blue-50 text-blue-700'
                        : 'bg-blue-50 text-blue-700'}`}>
                        {initials(c)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-headline-sm text-ink group-hover:text-live transition-colors">{c.full_name}</span>
                        <span className="text-code-sm font-mono text-ink-3 truncate">{c.email ?? 'no email'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-body-md text-ink whitespace-nowrap">
                      <Icon name="location_city" size={16} className="text-ink-3" />
                      {c.province}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-label-caps uppercase font-bold ${RISK_CHIP[c.risk_profile]}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                      {c.risk_profile}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-metric-code font-mono font-semibold text-ink tabular">{c.policy_count}</span>
                  </td>
                  <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-1">
                      <button title="View profile" onClick={() => setProfileId(c.client_id)}
                        className="p-1.5 rounded hover:bg-canvas text-ink-3 hover:text-ink transition-colors">
                        <Icon name="visibility" size={18} />
                      </button>
                      {isLead && (
                        <>
                          <button title="Edit client" onClick={() => setDrawer(c)}
                            className="p-1.5 rounded hover:bg-canvas text-ink-3 hover:text-ink transition-colors">
                            <Icon name="edit_square" size={18} />
                          </button>
                          <button title="Delete client" onClick={() => setConfirmDelete(c)}
                            className="p-1.5 rounded hover:bg-canvas text-ink-3 hover:text-danger transition-colors">
                            <Icon name="delete" size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* pagination footer */}
        <div className="px-space-md py-3 bg-canvas border-t border-rule flex flex-col sm:flex-row items-center justify-between gap-2 text-code-sm font-mono text-ink-3">
          <span>Displaying {stats.showing} of {num(total)} policyholders • JWT-protected</span>
          <div className="flex items-center gap-1">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
              className="px-2.5 py-1 rounded bg-white border border-rule disabled:opacity-40 hover:bg-surface-dim/40">Prev</button>
            <span className="px-2">Page {page + 1} of {stats.pages}</span>
            <button disabled={page + 1 >= stats.pages} onClick={() => setPage(p => p + 1)}
              className="px-2.5 py-1 rounded bg-white border border-rule disabled:opacity-40 hover:bg-surface-dim/40">Next</button>
          </div>
        </div>
      </div>

      {/* keep the mart sample browser below the directory */}
      <details className="group">
        <summary className="cursor-pointer list-none inline-flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-white border border-rule text-label-md text-ink-2 shadow-sm hover:bg-canvas transition-colors">
          <Icon name="grid_view" size={16} className="text-ink-3 group-open:rotate-90 transition-transform" />
          Batch mart sample browser
          <Tag tone="batch">Batch · daily</Tag>
        </summary>
        <div className="mt-space-md">
          <MartBrowser />
        </div>
      </details>

      {/* modals */}
      {drawer && (
        <ClientFormModal
          initial={drawer === 'new' ? null : drawer}
          onClose={() => setDrawer(null)}
          onSaved={msg => { setDrawer(null); setEditTarget(null); showToast(msg); load() }}
        />
      )}
      {profileId != null && !editTarget && (
        <ProfileDrawer
          clientId={profileId}
          isLead={isLead}
          onClose={() => setProfileId(null)}
          onEdit={client => setEditTarget(client)}
        />
      )}
      {editTarget && (
        <ClientFormModal
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={msg => { setEditTarget(null); setProfileId(null); showToast(msg); load() }}
        />
      )}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-spruce/40 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-xl shadow-sheet max-w-md w-full mx-4 p-space-lg">
            <div className="flex items-start gap-space-md">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center shrink-0">
                <Icon name="warning" size={22} />
              </div>
              <div>
                <div className="text-headline-md text-ink">Delete {confirmDelete.full_name}?</div>
                <p className="text-body-md text-ink-3 mt-1">
                  This permanently removes the policyholder <strong>and all their policies and claims</strong>.
                  Every delete streams through CDC to the derived layers — the POPIA right-to-erasure path.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-space-sm mt-space-lg">
              <button onClick={() => setConfirmDelete(null)}
                className="px-space-md py-2 rounded-lg bg-white border border-rule-strong text-ink text-label-md shadow-sm hover:bg-canvas">Cancel</button>
              <button onClick={() => onDelete(confirmDelete)}
                className="px-space-md py-2 rounded-lg bg-danger hover:bg-blue-900 text-white text-label-md shadow-md">Delete Client</button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className="fixed bottom-space-lg right-space-lg z-50 px-space-md py-2 rounded-lg bg-spruce text-white text-body-md shadow-sheet flex items-center gap-2">
          <Icon name="check_circle" size={16} className="text-blue-300" />
          {toast}
        </div>
      )}
    </div>
  )
}

// The old mart browser (ClientLookup), kept intact behind a disclosure so
// the batch demo stays reachable without crowding the operational directory.
function MartBrowser() {
  return <ClientLookup />
}
