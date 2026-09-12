import { Icon } from './Icons.jsx'
import { LiveDot } from './Primitives.jsx'
import { navigate } from '../router.js'

// Section → routes. `path` is the address-bar route; badge routes surface
// live figures from the shared polling context.
const sections = [
  { label: 'Overview', items: [
    { path: '/',          name: 'Dashboard',            icon: 'home' },
    { path: '/claims',    name: 'Claims',               icon: 'receipt_long', badge: 'open' },
    { path: '/policyholders', name: 'Clients',          icon: 'corporate_fare' },
    { path: '/access',    name: 'User Access',          icon: 'admin_panel_settings', crud: true },
  ]},
  { label: 'Analytics', items: [
    { path: '/performance', name: 'Province Performance', icon: 'map' },
  ]},
]

export default function Nav({ path, openCount }) {
  const go = p => (e) => { e.preventDefault(); navigate(p) }

  return (
    <nav className="bg-spruce text-white flex flex-col justify-between fixed inset-y-0 left-0 w-64 z-40 overflow-y-auto shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col">
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <a href="/" onClick={go('/')} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-live flex items-center justify-center text-white shadow-sm">
                <Icon name="shield_with_house" size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-headline-sm text-white tracking-tight leading-none">New-Mutual</span>
                <span className="text-code-sm font-mono text-slate-400 uppercase mt-0.5 tracking-wider">Financial Ops</span>
              </div>
            </a>
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10">
            <LiveDot />
            <span className="text-code-sm font-mono text-blue-300">Live</span>
          </div>
          <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded bg-white/10 text-label-caps text-slate-400 tracking-wider uppercase">
            Operations Dashboard
          </div>
        </div>

        <div className="flex flex-col px-2 gap-1 mt-1">
          {sections.map(section => (
            <div key={section.label}>
              <div className="text-label-caps text-slate-500 tracking-wider uppercase px-3 pt-4 pb-1.5">
                {section.label}
              </div>
              {section.items.map(({ path: p, name, icon, badge, crud }) => {
                const active = path === p
                return (
                  <a
                    key={p}
                    href={p}
                    onClick={go(p)}
                    aria-current={active ? 'page' : undefined}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg
                                transition-colors text-left text-body-md
                                ${active
                                  ? 'bg-white text-ink shadow-sm font-semibold'
                                  : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon name={icon} size={18} />
                      {name}
                    </span>
                    {badge === 'open' && openCount != null && (
                      <span className="px-2 py-0.5 rounded-full bg-live text-white text-code-sm font-mono font-semibold">
                        {openCount}
                      </span>
                    )}
                    {crud && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-300 text-spruce text-label-caps uppercase tracking-wider">New CRUD</span>
                    )}
                  </a>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="px-2 pb-5 flex flex-col gap-2 mt-6">
        <div className="h-px w-full bg-white/10" />
        <a
          href="/status"
          onClick={go('/status')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg
                      transition-colors text-left text-body-sm
                      ${path === '/status'
                        ? 'bg-white text-ink shadow-sm font-semibold'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
        >
          <span className="flex items-center gap-2">
            <Icon name="dns" size={18} />
            System Status
          </span>
          <span className="w-2 h-2 rounded-full bg-blue-300" />
        </a>
        <div className="px-3 pt-1 flex items-center justify-between text-slate-500 text-code-sm font-mono">
          <span className="tracking-wide">v1.0.0-PROD</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />Sync OK
          </span>
        </div>
      </div>
    </nav>
  )
}
