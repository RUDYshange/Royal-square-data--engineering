import { useLive } from '../context/LiveContext.jsx'
import { api } from '../api.js'
import { usePolling } from '../hooks/usePolling.js'
import LivePipeline from '../components/LivePipeline.jsx'
import OpenClaims   from '../components/OpenClaims.jsx'
import { Card, Tag } from '../components/Primitives.jsx'
import { Icon } from '../components/Icons.jsx'
import { zar, num } from '../api.js'

// Stage breakdown as a data table — the belt summarises, this enumerates.
function StageTable({ stages }) {
  const rows = [
    { key: 'lodged',    name: 'Lodged',    tone: 'bg-amber' },
    { key: 'assessing', name: 'Assessing', tone: 'bg-info' },
    { key: 'approved',  name: 'Approved',  tone: 'bg-live' },
    { key: 'rejected',  name: 'Rejected',  tone: 'bg-danger' },
    { key: 'paid',      name: 'Paid',      tone: 'bg-paid' },
  ]
  const total = Object.values(stages).reduce((a, b) => a + b, 0)

  return (
    <Card title="Stage Breakdown" subtitle="Live counts by claim lifecycle stage"
          icon={<Icon name="stacked_bar_chart" size={20} />}
          tag={<Tag tone="live"><span className="w-1.5 h-1.5 rounded-full bg-live animate-pulseDot" />Live</Tag>}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-canvas">
              {['Stage', 'Claims', 'Share'].map(h => (
                <th key={h} className="text-left text-label-caps text-ink-3 uppercase tracking-wider px-space-lg py-2.5 border-b border-rule">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const n = stages[r.key] ?? 0
              return (
                <tr key={r.key} className="hover:bg-canvas transition-colors">
                  <td className="px-space-lg py-3 border-b border-rule">
                    <span className="inline-flex items-center gap-2 text-body-lg font-semibold text-ink">
                      <span className={`w-2.5 h-2.5 rounded-full ${r.tone}`} />{r.name}
                    </span>
                  </td>
                  <td className="px-space-lg py-3 border-b border-rule text-body-md font-mono tabular">{num(n)}</td>
                  <td className="px-space-lg py-3 border-b border-rule">
                    <div className="flex items-center gap-2">
                      <div className="w-40 h-2 rounded-full bg-surface-dim/70 overflow-hidden">
                        <div className={`h-full rounded-full ${r.tone}`}
                             style={{ width: total ? `${Math.round(n / total * 100)}%` : '0%' }} />
                      </div>
                      <span className="text-metric-code font-mono tabular text-ink-2">
                        {total ? `${Math.round(n / total * 100)}%` : '—'}
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export default function Claims() {
  const live = useLive()
  const open20 = usePolling(() => api.openClaims(20), 6000)

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pt-1 mb-space-lg">
        <div className="flex items-center gap-space-md">
          <span className="text-headline-lg text-ink tracking-tight">Claims</span>
          <span className="px-2 py-0.5 rounded-full bg-surface-dim/60 text-ink-2 text-label-caps uppercase tracking-wider">
            {live.pipeline.error ? 'stream offline' : `${live.openCount} open · ${live.openCount + (live.stages.approved ?? 0) + (live.stages.rejected ?? 0) + (live.stages.paid ?? 0)} total`}
          </span>
        </div>
      </div>

      <LivePipeline stages={live.stages} error={live.pipeline.error} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        <div className="lg:col-span-5">
          <StageTable stages={live.stages} />
        </div>
        <div className="lg:col-span-7">
          <OpenClaims
            claims={(open20.data?.claims) ?? live.claims.data?.claims}
            error={open20.error ?? live.claims.error}
            lastEventTs={live.pipeline.data?.last_event_ts}
          />
        </div>
      </div>
    </>
  )
}
