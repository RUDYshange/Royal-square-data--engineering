import { Icon } from './Icons.jsx'
import { LiveDot } from './Primitives.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { greeting } from '../greeting.js'

// 48px-ish persistent utility bar: greeting + sync telemetry on the left,
// refresh / user identity on the right. Data flow mirrors the old header:
// the parent owns refreshAll and passes down live/batch state.
export default function Topbar({ onRefresh, spinning, streamAge, healthError }) {
  const { user, logout } = useAuth()
  const displayName = user?.full_name
    ? user.full_name.split(' ')[0] + (user.full_name.includes(' ') ? ' ' + user.full_name.trim().split(' ').pop()[0] + '.' : '')
    : 'Itumeleng M.'
  const syncState = healthError
    ? { label: 'API unreachable', color: 'text-danger', dot: 'bg-danger' }
    : streamAge == null
      ? { label: 'Awaiting stream', color: 'text-blue-600', dot: 'bg-blue-400' }
      : streamAge < 120
        ? { label: 'Realtime Sync Connected', color: 'text-ink-3', dot: 'bg-live animate-pulseDot' }
        : { label: `Last event ${Math.round(streamAge / 60)}m ago`, color: 'text-blue-600', dot: 'bg-blue-400' }

  return (
    <header className="h-16 shrink-0 bg-white/90 backdrop-blur border-b border-rule
                       flex items-center justify-between px-space-xl gap-4 sticky top-0 z-30">
      <div className="min-w-0">
        <span className="text-headline-sm text-ink block truncate">{greeting()}, {user?.full_name?.split(' ')[0] ?? 'Itumeleng'}</span>
        <div className="flex items-center gap-2">
          <LiveDot up={!healthError} />
          <span className={`text-code-sm font-mono ${syncState.color}`}>{syncState.label}</span>
        </div>
      </div>

      <div className="flex items-center gap-space-md shrink-0">
        <button
          onClick={onRefresh}
          title="Quick Refresh Data"
          className="w-8 h-8 rounded-lg bg-white hover:bg-surface-dim/50 text-ink
                     flex items-center justify-center shadow-card transition-colors"
        >
          <span className={spinning ? 'animate-spin inline-flex' : 'inline-flex'}>
            <Icon name="refresh" size={18} />
          </span>
        </button>
        <div className="h-6 w-px bg-surface-dim hidden sm:block" />
        <div className="flex items-center gap-2 pl-1">
          <div className="flex flex-col text-right hidden sm:flex">
            <span className="text-label-md text-ink leading-tight">{displayName}</span>
            <span className="text-label-caps text-live font-bold uppercase tracking-wider">{user?.role_title ?? 'Operations Lead'}</span>
          </div>
          <button
            onClick={() => { logout() }}
            title="Sign out — ends the operator session"
            className="w-8 h-8 rounded-full bg-spruce flex items-center justify-center hover:bg-spruce-hover transition-colors"
          >
            <Icon name="person" size={18} className="text-white" />
          </button>
        </div>
        <div className="w-8 h-8 rounded-lg bg-white hover:bg-surface-dim/50 text-ink-2
                        items-center justify-center shadow-card transition-colors hidden sm:flex"
             title="Operational Notifications"
        >
          <span className="relative inline-flex">
            <Icon name="notifications" size={18} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-danger ring-2 ring-white" />
          </span>
        </div>
      </div>
    </header>
  )
}
