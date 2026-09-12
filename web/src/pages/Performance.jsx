import { useMemo } from 'react'
import { useLive } from '../context/LiveContext.jsx'
import { zar, num, pct } from '../api.js'
import ProvinceTable from '../components/ProvinceTable.jsx'
import { Card, Tag, Empty } from '../components/Primitives.jsx'
import { Icon } from '../components/Icons.jsx'

const CODES = {
  'Gauteng': 'GP', 'Western Cape': 'WC', 'KwaZulu-Natal': 'KZN',
  'Eastern Cape': 'EC', 'Free State': 'FS', 'Limpopo': 'LP',
  'Mpumalanga': 'MP', 'North West': 'NW', 'Northern Cape': 'NC',
}

// Loss-ratio narrative chips — same thresholds as the table's colour code.
function Verdict({ ratio }) {
  if (ratio == null) return null
  if (ratio >= 1)   return <span className="px-2 py-0.5 rounded bg-danger-bg text-blue-800 text-label-caps uppercase font-bold">Losing money</span>
  if (ratio >= 0.6) return <span className="px-2 py-0.5 rounded bg-amber-bg text-blue-800 text-label-caps uppercase font-bold">Monitor</span>
  return            <span className="px-2 py-0.5 rounded bg-live-bg text-blue-800 text-label-caps uppercase font-bold">Healthy</span>
}

function ProvinceCards({ rows }) {
  const totalPremium = useMemo(
    () => rows.reduce((a, r) => a + Number(r.premium || 0), 0), [rows]
  )

  if (!rows.length) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-space-md">
      {rows.map(r => {
        const ratio = r.loss_ratio || 0
        const share = totalPremium ? Number(r.premium || 0) / totalPremium : 0
        return (
          <div key={r.province} className="p-space-lg rounded-lg bg-white border border-rule shadow-card hover:shadow-raise transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded bg-surface-dim/70 flex items-center justify-center text-code-sm font-mono font-bold text-ink">
                  {CODES[r.province] ?? r.province?.slice(0, 2).toUpperCase()}
                </span>
                <span className="text-headline-sm text-ink">{r.province}</span>
              </div>
              <Verdict ratio={ratio} />
            </div>

            <div className="mt-space-md flex items-baseline gap-2">
              <span className={`text-metric-xl font-bold tabular ${ratio >= 1 ? 'text-danger' : ratio >= 0.6 ? 'text-blue-700' : 'text-live'}`}>
                {pct(ratio)}
              </span>
              <span className="text-code-sm font-mono text-ink-3">loss ratio</span>
            </div>

            <div className="mt-2 w-full bg-surface-dim/70 h-2 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-[width] duration-700 ${ratio >= 1 ? 'bg-danger' : ratio >= 0.6 ? 'bg-amber' : 'bg-live'}`}
                   style={{ width: `${Math.min(100, ratio * 100)}%` }} />
            </div>

            <div className="mt-space-md flex items-center justify-between text-code-sm font-mono text-ink-3">
              <span>{num(r.clients)} clients</span>
              <span>{zar(r.premium)} premium</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-surface-dim/70 overflow-hidden">
                <div className="h-full rounded-full bg-spruce" style={{ width: `${Math.round(share * 100)}%` }} />
              </div>
              <span className="text-code-sm font-mono text-ink-3">{Math.round(share * 100)}% of book</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Performance() {
  const live = useLive()
  const rows = live.provinces
  const sorted = useMemo(() => [...rows].sort((a, b) => (b.loss_ratio || 0) - (a.loss_ratio || 0)), [rows])

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pt-1 mb-space-lg">
        <div className="flex items-center gap-space-md">
          <span className="text-headline-lg text-ink tracking-tight">Province Performance</span>
          <span className="px-2 py-0.5 rounded-full bg-surface-dim/60 text-ink-2 text-label-caps uppercase tracking-wider">
            Loss ratio by territory · batch daily
          </span>
        </div>
      </div>

      {live.lossRatio.error || !rows.length ? (
        <Card title="No mart data yet" icon={<Icon name="sync_problem" size={20} />} tag={<Tag tone="batch">Batch · daily</Tag>}>
          <Empty icon="sync_problem">
            The analytics mart has not been built. Run <span className="font-mono text-code-sm text-ink bg-surface-dim/60 px-1.5 py-0.5 rounded">make batch</span> (or <span className="font-mono text-code-sm text-ink bg-surface-dim/60 px-1.5 py-0.5 rounded">.\make.ps1 batch</span>) to populate loss ratios.
          </Empty>
        </Card>
      ) : (
        <>
          <div className="mb-space-lg">
            <ProvinceCards rows={sorted} />
          </div>
          <ProvinceTable rows={rows} error={live.lossRatio.error} />
        </>
      )}
    </>
  )
}
