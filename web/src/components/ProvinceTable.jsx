import { Card, Empty, Tag } from './Primitives.jsx'
import { Icon } from './Icons.jsx'
import { zar, num, pct } from '../api.js'

// A loss ratio above 1.0 means claims paid exceeded premium collected —
// the province is losing money. Colour carries that meaning so the number
// does not have to be interpreted.
function ratioTone(r) {
  if (r >= 1)   return { bar: 'bg-danger', text: 'text-danger' }
  if (r >= 0.6) return { bar: 'bg-amber',  text: 'text-blue-700' }
  return          { bar: 'bg-live',   text: 'text-live' }
}

const CODES = {
  'Gauteng': 'GP', 'Western Cape': 'WC', 'KwaZulu-Natal': 'KZN',
  'Eastern Cape': 'EC', 'Free State': 'FS', 'Limpopo': 'LP',
  'Mpumalanga': 'MP', 'North West': 'NW', 'Northern Cape': 'NC',
}

export default function ProvinceTable({ rows, error }) {
  const sorted = [...(rows ?? [])].sort((a, b) => (b.loss_ratio || 0) - (a.loss_ratio || 0))
  const max    = Math.max(...sorted.map(r => r.loss_ratio || 0), 0.01)

  return (
    <Card
      title="Province Performance & Volume"
      subtitle="Loss ratios and claim concentration across primary territories"
      icon={<Icon name="map" size={20} />}
      tag={<Tag tone="batch">Batch · daily</Tag>}
    >
      {error || !sorted.length ? (
        <Empty icon="sync_problem">
          The daily mart has not been built yet. Run <span className="font-mono text-code-sm text-ink bg-surface-dim/60 px-1.5 py-0.5 rounded">make batch</span> to populate it.
        </Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-canvas">
                {['Province', 'Clients', 'Premium collected', 'Loss ratio'].map(h => (
                  <th key={h} className="text-left text-label-caps text-ink-3 uppercase tracking-wider px-space-lg py-2.5 border-b border-rule">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(r => {
                const ratio = r.loss_ratio || 0
                const tone  = ratioTone(ratio)
                return (
                  <tr key={r.province} className="hover:bg-canvas transition-colors group">
                    <td className="px-space-lg py-3 border-b border-rule">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 shrink-0 rounded bg-surface-dim/70 flex items-center justify-center text-code-sm font-mono font-bold text-ink">
                          {CODES[r.province] ?? r.province?.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="text-body-lg font-semibold text-ink group-hover:text-live transition-colors">{r.province}</span>
                      </div>
                    </td>
                    <td className="px-space-lg py-3 border-b border-rule text-body-md tabular">{num(r.clients)}</td>
                    <td className="px-space-lg py-3 border-b border-rule text-body-md font-mono tabular">{zar(r.premium)}</td>
                    <td className="px-space-lg py-3 border-b border-rule">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full bg-surface-dim/70 overflow-hidden">
                          <div className={`h-full rounded-full transition-[width] duration-700 ${tone.bar}`}
                               style={{ width: `${Math.max(4, Math.round(ratio / max * 100))}%` }} />
                        </div>
                        <span className={`text-metric-code font-mono tabular ${tone.text}`}>{pct(ratio)}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
