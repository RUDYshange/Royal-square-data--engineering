import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, num } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { Icon } from '../components/Icons.jsx'

// ── display vocabularies (server values → labels) ─────────────────────
const ROLE_LABEL = {
  assessor:        'Claims Assessor',
  senior_assessor: 'Senior Assessor',
  ops_lead:        'Operations Lead',
  batch_engineer:  'Batch Engineer',
  risk_analyst:    'Risk Analyst',
}
const ROLE_ICON = {
  assessor: 'policy', senior_assessor: 'fact_check', ops_lead: 'shield_person',
  batch_engineer: 'terminal', risk_analyst: 'query_stats',
}
const STATUS_CHIP = {
  active:    'bg-blue-50 text-blue-700',
  invited:   'bg-blue-50 text-blue-700',
  suspended: 'bg-blue-50 text-blue-900',
}
const PROVINCES = ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape']
const PROVINCE_LABEL = {
  'Gauteng': 'Gauteng (JHB HQ)', 'Western Cape': 'Western Cape (CPT)',
  'KwaZulu-Natal': 'KwaZulu-Natal (DBN)', 'Eastern Cape': 'Eastern Cape',
}
const ROLES = Object.keys(ROLE_LABEL)
const STATUSES = ['active', 'invited', 'suspended']

const initials = name => (name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()

const field = 'w-full px-3 py-2 rounded-lg bg-canvas border border-rule text-body-md text-ink focus:outline-none focus:border-live transition-colors'

// ── slide-over form: create + edit ────────────────────────────────────
function UserFormModal({ initial, onClose, onSaved }) {
  const editing = !!initial?.user_id
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    full_name: initial?.full_name ?? '',
    email: initial?.email ?? '',
    role: initial?.role ?? 'assessor',
    province: initial?.province ?? 'Gauteng',
    status: initial?.status ?? 'active',
    assigned_claims: initial?.assigned_claims ?? 0,
  })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      const body = { ...form, assigned_claims: Number(form.assigned_claims) || 0 }
      if (editing) await api.updateUser(initial.user_id, body)
      else await api.createUser(body)
      onSaved(editing ? `${form.full_name} updated` : `${form.full_name} added to the directory`)
    } catch (err) {
      setError(err.message || 'Save failed')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-spruce/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full w-full max-w-xl bg-white shadow-sheet flex flex-col">
        {/* header */}
        <div className="px-space-lg py-space-md bg-canvas border-b border-rule flex items-center justify-between shrink-0">
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-xl bg-spruce text-white flex items-center justify-center shadow-sm">
              <Icon name="manage_accounts" size={20} />
            </div>
            <div>
              <div className="text-headline-md text-ink leading-tight">
                {editing ? 'Edit User Profile & Permissions' : 'Onboard New Operator'}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-code-sm font-mono text-live font-bold">{editing ? `USER-${initial.user_id}` : 'NEW-ENTRY'}</span>
                {editing && (
                  <span className={`px-1.5 py-0.5 rounded text-label-caps uppercase font-bold ${STATUS_CHIP[initial.status]}`}>
                    {initial.status}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white border border-rule text-ink-3 hover:text-ink flex items-center justify-center">
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* body */}
        <form onSubmit={submit} className="flex-1 overflow-y-auto p-space-lg space-y-space-lg">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
              <Icon name="error" size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-space-md">
            <div className="flex items-center justify-between">
              <span className="text-label-caps text-ink-3 uppercase tracking-wider">Identity & Department</span>
              <span className="text-code-sm font-mono text-ink-3">Mandatory fields *</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
              <label className="flex flex-col gap-1">
                <span className="text-label-md text-ink">Full Name *</span>
                <input required minLength={2} maxLength={120} value={form.full_name} onChange={set('full_name')} className={field} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-label-md text-ink">Work Email *</span>
                <input required type="email" value={form.email} onChange={set('email')} className={field} />
              </label>
            </div>
          </div>

          <div className="space-y-space-md">
            <div className="flex items-center justify-between">
              <span className="text-label-caps text-ink-3 uppercase tracking-wider">Access Scope & Authority</span>
              <span className="text-code-sm font-mono text-live">Auto-synced to Policy Engine</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
              <label className="flex flex-col gap-1">
                <span className="text-label-md text-ink">Security Role *</span>
                <select value={form.role} onChange={set('role')} className={field}>
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-label-md text-ink">Province Office *</span>
                <select value={form.province} onChange={set('province')} className={field}>
                  {PROVINCES.map(p => <option key={p} value={p}>{PROVINCE_LABEL[p]}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-label-md text-ink">Account Status</span>
                <select value={form.status} onChange={set('status')} className={field}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {form.status === 'invited' && (
                  <span className="text-code-sm font-mono text-blue-600">Invited accounts cannot sign in until activated</span>
                )}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-label-md text-ink">Assigned Claims</span>
                <input type="number" min={0} max={100000} value={form.assigned_claims} onChange={set('assigned_claims')} className={`${field} font-mono`} />
              </label>
            </div>
          </div>

          <div className="p-space-md rounded-xl bg-canvas border border-rule text-code-sm font-mono text-ink-3 flex items-start gap-2">
            <Icon name="policy" size={16} className="mt-0.5 shrink-0 text-live" />
            <span>POPIA: no passwords or RSA IDs are stored here — credentials live in the identity provider. Directory changes are attributed to your JWT identity.</span>
          </div>

          {/* footer */}
          <div className="flex items-center justify-end gap-space-sm pt-space-md border-t border-rule sticky bottom-0 bg-white">
            <button type="button" onClick={onClose}
              className="px-space-md py-2 rounded-lg bg-white border border-rule-strong text-ink text-label-md shadow-sm hover:bg-canvas transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={busy}
              className="px-space-lg py-2 rounded-lg bg-spruce hover:bg-spruce-hover text-white text-label-md shadow-md transition-colors disabled:opacity-70 flex items-center gap-2">
              {busy
                ? <><span className="w-2 h-2 rounded-full bg-blue-300 animate-pulse" />Saving…</>
                : <><Icon name="save" size={16} />{editing ? 'Save Changes' : 'Create User'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── the page ──────────────────────────────────────────────────────────
export default function UserAccess() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState(null)        // null = loading
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [drawer, setDrawer] = useState(null)      // null | 'new' | user object
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [toast, setToast] = useState(null)

  const load = useCallback(async () => {
    try {
      const res = await api.users({})
      setUsers(res.users ?? [])
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to load directory')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    if (!users) return null
    const q = search.trim().toLowerCase()
    return users.filter(u =>
      (roleFilter === 'all' || u.role === roleFilter) &&
      (statusFilter === 'all' || u.status === statusFilter) &&
      (!q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    )
  }, [users, search, roleFilter, statusFilter])

  const stats = useMemo(() => {
    if (!users) return null
    const active = users.filter(u => u.status === 'active').length
    return {
      total: users.length,
      activeRate: users.length ? Math.round(active / users.length * 100) : 0,
      assessors: users.filter(u => u.role === 'assessor' || u.role === 'senior_assessor').length,
      invited: users.filter(u => u.status === 'invited').length,
      roles: new Set(users.map(u => u.role)).size,
    }
  }, [users])

  const isLead = me?.role === 'ops_lead'
  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2600) }

  async function onDelete(user) {
    try {
      await api.deleteUser(user.user_id)
      setConfirmDelete(null)
      showToast(`${user.full_name} removed from the directory`)
      load()
    } catch (err) {
      setConfirmDelete(null)
      showToast(err.message)
    }
  }

  return (
    <div className="space-y-space-lg">
      {/* breadcrumb + session banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm pb-space-sm">
        <div className="flex items-center gap-space-xs text-body-sm text-ink-3">
          <span>Access Governance</span>
          <Icon name="chevron_right" size={14} />
          <span>Platform Security</span>
          <Icon name="chevron_right" size={14} />
          <span className="text-ink font-semibold">Directory & Team Roles</span>
        </div>
        <div className="flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-canvas font-mono text-code-sm text-ink-2 self-start md:self-auto">
          <span className="w-2 h-2 rounded-full bg-live" />
          JWT Session: {me?.email ?? '…'}
        </div>
      </div>

      {/* section header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">
        <div className="flex flex-col gap-1 max-w-2xl">
          <div className="flex items-center gap-space-sm">
            <h1 className="text-display-hero text-ink tracking-tight">User & Access Management</h1>
            <span className="px-2 py-0.5 rounded-full bg-canvas text-ink-3 font-mono text-code-sm">RBAC 2.4</span>
          </div>
          <p className="text-body-md text-ink-3">
            Manage platform operators, assessors, batch engineers and permission roles across regional jurisdictions.
          </p>
        </div>
        {isLead && (
          <button onClick={() => setDrawer('new')}
            className="inline-flex items-center gap-2 px-space-lg py-2 rounded-lg bg-spruce hover:bg-spruce-hover text-white text-label-md shadow-md transition-all self-start lg:self-auto">
            <Icon name="person_add" size={18} />
            Add New User
          </button>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        {[
          { label: 'Total Platform Users', value: stats?.total, icon: 'group', sub: `${stats?.activeRate ?? 0}% active rate`, bar: 'bg-spruce' },
          { label: 'Active Assessors', value: stats?.assessors, icon: 'assignment_ind', sub: 'Claims operations', bar: 'bg-live' },
          { label: 'Pending Invites', value: stats?.invited, icon: 'mark_email_unread', sub: 'Awaiting activation', bar: 'bg-blue-400' },
          { label: 'System Role Policies', value: stats?.roles, icon: 'verified_user', sub: 'Zero-Trust RBAC', bar: 'bg-info' },
        ].map(c => (
          <div key={c.label} className="relative overflow-hidden rounded-xl bg-white border border-rule shadow-card p-space-md flex flex-col justify-between hover:shadow-raise transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-label-caps text-ink-3 uppercase tracking-wider">{c.label}</span>
                <span className="text-3xl font-bold text-ink mt-1">{c.value ?? '—'}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-canvas border border-rule flex items-center justify-center text-ink-2">
                <Icon name={c.icon} size={22} />
              </div>
            </div>
            <div className="mt-space-md text-label-md text-ink-3">{c.sub}</div>
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${c.bar}`} />
          </div>
        ))}
      </div>

      {/* filter bar */}
      <div className="bg-white border border-rule rounded-xl shadow-card p-space-md flex flex-col lg:flex-row items-stretch lg:items-center gap-space-md">
        <div className="relative flex-1">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email address…"
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-canvas border border-rule text-body-md text-ink placeholder:text-ink-3 focus:outline-none focus:border-live" />
        </div>
        <div className="flex items-center flex-wrap gap-space-sm">
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-canvas border border-rule text-body-md text-ink focus:outline-none focus:border-live">
            <option value="all">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-canvas border border-rule text-body-md text-ink focus:outline-none focus:border-live">
            <option value="all">Status: All</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {(search || roleFilter !== 'all' || statusFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setRoleFilter('all'); setStatusFilter('all') }}
              title="Clear Filters"
              className="p-2 rounded-lg bg-canvas border border-rule text-ink-3 hover:text-ink flex items-center justify-center">
              <Icon name="filter_list_off" size={18} />
            </button>
          )}
        </div>
      </div>

      {/* directory table */}
      <div className="bg-white border border-rule rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-canvas text-label-caps text-ink-3 uppercase tracking-wider border-b border-rule">
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Security Role</th>
                <th className="py-3 px-4">Province Office</th>
                <th className="py-3 px-4">Assigned Claims</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {filtered === null && !error && (
                <tr><td colSpan={6} className="py-10 text-center text-body-md text-ink-3">Loading directory…</td></tr>
              )}
              {error && (
                <tr><td colSpan={6} className="py-10 text-center text-body-md text-danger">{error}</td></tr>
              )}
              {filtered?.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-body-md text-ink-3">No operators match the current filters.</td></tr>
              )}
              {filtered?.map(u => (
                <tr key={u.user_id} className="hover:bg-canvas/60 transition-colors group">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-space-sm">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-label-md shadow-sm shrink-0 ${
                        u.role === 'ops_lead' ? 'bg-spruce text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                        {initials(u.full_name)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-headline-sm text-ink group-hover:text-live transition-colors">{u.full_name}</span>
                        <span className="text-code-sm font-mono text-ink-3 truncate">{u.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-canvas border border-rule text-code-sm font-mono text-ink-2 whitespace-nowrap">
                      <Icon name={ROLE_ICON[u.role] ?? 'badge'} size={14} />
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-body-md text-ink whitespace-nowrap">
                      <Icon name="location_city" size={16} className="text-ink-3" />
                      {u.province}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-metric-code font-mono font-semibold ${u.assigned_claims > 15 ? 'text-danger' : 'text-ink'}`}>
                        {num(u.assigned_claims)}
                      </span>
                      <div className="w-16 h-1.5 rounded-full bg-canvas overflow-hidden">
                        <div className={`h-full ${u.assigned_claims > 15 ? 'bg-danger' : 'bg-live'}`}
                          style={{ width: `${Math.min(100, (u.assigned_claims || 0) * 5)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-label-caps uppercase font-bold ${STATUS_CHIP[u.status]}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      {isLead ? (
                        <>
                          <button onClick={() => setDrawer(u)} title="Edit user"
                            className="p-1.5 rounded hover:bg-canvas text-ink-3 hover:text-ink transition-colors">
                            <Icon name="edit_square" size={18} />
                          </button>
                          <button onClick={() => setConfirmDelete(u)} title="Delete user"
                            disabled={u.user_id === me?.user_id}
                            className={`p-1.5 rounded transition-colors ${u.user_id === me?.user_id ? 'text-ink-3/40 cursor-not-allowed' : 'text-ink-3 hover:text-danger'}`}>
                            <Icon name="delete" size={18} />
                          </button>
                        </>
                      ) : (
                        <span className="text-code-sm font-mono text-ink-3/70 pr-2">read-only</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-space-md py-3 bg-canvas border-t border-rule flex items-center justify-between text-code-sm font-mono text-ink-3">
          <span>Displaying {filtered?.length ?? 0} of {stats?.total ?? 0} operators • JWT-protected endpoint</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-live" />Live from ops.app_users</span>
        </div>
      </div>

      {/* POPIA banner */}
      <div className="p-space-md rounded-xl bg-white border border-rule shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 shrink-0">
            <Icon name="policy" size={26} />
          </div>
          <div className="flex flex-col">
            <span className="text-headline-sm text-ink">POPIA & FAIS Compliance Snapshot</span>
            <span className="text-body-sm text-ink-3">Directory changes require the Operations Lead role and are attributed to your JWT identity.</span>
          </div>
        </div>
        <span className="text-code-sm font-mono text-ink-3">ops.app_users • POPIA-minimal schema</span>
      </div>

      {/* create / edit drawer */}
      {drawer && (
        <UserFormModal
          initial={drawer === 'new' ? null : drawer}
          onClose={() => setDrawer(null)}
          onSaved={msg => { setDrawer(null); showToast(msg); load() }}
        />
      )}

      {/* delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-spruce/40 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-xl shadow-sheet max-w-md w-full mx-4 p-space-lg">
            <div className="flex items-start gap-space-md">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center shrink-0">
                <Icon name="warning" size={22} />
              </div>
              <div>
                <div className="text-headline-md text-ink">Remove {confirmDelete.full_name}?</div>
                <p className="text-body-md text-ink-3 mt-1">
                  This permanently deletes the operator account. The email address can be registered again afterwards.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-space-sm mt-space-lg">
              <button onClick={() => setConfirmDelete(null)}
                className="px-space-md py-2 rounded-lg bg-white border border-rule-strong text-ink text-label-md shadow-sm hover:bg-canvas">Cancel</button>
              <button onClick={() => onDelete(confirmDelete)}
                className="px-space-md py-2 rounded-lg bg-danger hover:bg-blue-900 text-white text-label-md shadow-md transition-colors">Delete User</button>
            </div>
          </div>
        </div>
      )}

      {/* toast */}
      {toast && (
        <div className="fixed bottom-space-lg right-space-lg z-50 px-space-md py-2 rounded-lg bg-spruce text-white text-body-md shadow-sheet flex items-center gap-2">
          <Icon name="check_circle" size={16} className="text-blue-300" />
          {toast}
        </div>
      )}
    </div>
  )
}
