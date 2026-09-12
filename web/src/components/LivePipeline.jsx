import { useEffect, useRef, useState } from 'react'
import { LiveDot } from './Primitives.jsx'

// Stage accents follow the DESIGN.md pipeline hues:
// Lodged amber, Assessing slate blue, Approved teal, Rejected rose, Paid indigo.
const STAGES = [
  { key: 'lodged',    name: 'Lodged',    sub: 'claims',    dot: 'bg-blue-400',    bar: 'bg-amber' },
  { key: 'assessing', name: 'Assessing', sub: 'in queue',  dot: 'bg-blue-400',     bar: 'bg-info' },
  { key: 'approved',  name: 'Approved',  sub: 'verified',  dot: 'bg-live',         bar: 'bg-live' },
  { key: 'rejected',  name: 'Rejected',  sub: 'declined',  dot: 'bg-danger',       bar: 'bg-danger' },
  { key: 'paid',      name: 'Paid',      sub: 'settled',   dot: 'bg-spruce-dim',   bar: 'bg-paid' },
]

/** Flashes teal for a moment whenever its number changes — the one place
 *  in the app where motion is not user-triggered, because a changing
 *  number is exactly what a person needs to notice here. */
function StageCount({ value }) {
  const [flash, setFlash] = useState(false)
  const prev = useRef(value)

  useEffect(() => {
    if (prev.current !== value && prev.current !== undefined) {
      setFlash(true)
      const t = setTimeout(() => setFlash(false), 1200)
      return () => clearTimeout(t)
    }
    prev.current = value
  }, [value])

  return (
    <span className={`text-metric-xl tabular font-bold leading-none transition-colors duration-500
                      ${flash ? 'text-live' : 'text-ink'}`}>
      {value ?? '—'}
    </span>
  )
}

export default function LivePipeline({ stages = {}, error }) {
  const total = Object.values(stages).reduce((a, b) => a + b, 0)

  return (
    <div className="bg-white border border-rule rounded-lg shadow-card p-space-md mb-space-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-space-sm gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-headline-sm text-ink">Claims Pipeline</span>
          <span className="flex items-center gap-1.5 text-code-sm font-mono text-ink-3">
            <LiveDot />
            {error ? 'stream offline' : total ? `${total} Total Pipeline Items` : 'awaiting events'}
          </span>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg bg-canvas border border-rule px-4 py-3 text-body-md text-ink-2">
          Not receiving events. Start the stream consumer:
          <span className="font-mono text-code-sm text-ink bg-surface-dim/60 px-1.5 py-0.5 rounded ml-1">
            docker compose up -d stream-consumer
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-space-xs pt-space-xs">
          {STAGES.map(({ key, name, sub, dot, bar }) => (
            <div
              key={key}
              className="group relative overflow-hidden flex flex-col p-space-sm rounded-lg
                         bg-canvas hover:bg-surface-dim/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-label-caps text-ink-3 uppercase">{name}</span>
                <span className={`w-2 h-2 rounded-full ${dot}`} />
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <StageCount value={stages[key]} />
                <span className="text-code-sm font-mono text-ink-3">{sub}</span>
              </div>
              <div className="mt-2 h-2.5 rounded-full bg-surface-dim/70 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-[width] duration-700 ${bar}`}
                  style={{ width: total ? `${Math.round((stages[key] || 0) / total * 100)}%` : '0%' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
