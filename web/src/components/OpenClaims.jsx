import { useState, useEffect } from 'react'
import { Card, Empty, StatusChip, Tag } from './Primitives.jsx'
import { Icon } from './Icons.jsx'
import { zar } from '../api.js'

// The API's open-claims feed carries id + amount only, so stage labels are
// an honest simplification: everything here is "Open" until assessed.
function timeAgo(tsSeconds) {
  if (!tsSeconds) return null
  const s = Math.max(0, Math.round((Date.now() / 1000) - Number(tsSeconds)))
  if (s < 60) return 'moments ago'
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}

export default function OpenClaims({ claims, error, lastEventTs }) {
  const [selected, setSelected] = useState(null)

  // Close the sheet if the underlying list changes underneath it.
  useEffect(() => {
    if (selected && claims && !claims.some(c => c.claim_id === selected.claim_id)) {
      setSelected(null)
    }
  }, [claims, selected])

  const list = claims ?? []
  const total = list.length
    ? zar(list.reduce((a, c) => a + Number(c.amount || 0), 0))
    : '—'

  return (
    <>
      <Card
        title="Largest Open Claims"
        subtitle="Prioritized by exposure magnitude"
        icon={<Icon name="receipt_long" size={20} />}
        tag={<Tag tone="live"><span className="w-1.5 h-1.5 rounded-full bg-live animate-pulseDot" />Live</Tag>}
      >
        {error || !list.length ? (
          <Empty icon="inbox">
            No open claims in the live view. Lodge one in the source database and it appears here within seconds.
          </Empty>
        ) : (
          <>
            <div className="flex flex-col divide-y divide-rule">
              {list.map(c => (
                <div key={c.claim_id} className="py-space-md px-space-lg first:pt-space-md flex flex-col gap-2 group hover:bg-canvas transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-metric-code font-mono text-ink font-bold">Claim {c.claim_id}</span>
                      <StatusChip kind="open">Open</StatusChip>
                    </div>
                    <span className="text-headline-sm text-ink tracking-tight tabular">{zar(c.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-code-sm font-mono text-ink-3">
                      {lastEventTs ? `Stream event ${timeAgo(lastEventTs)}` : 'Live sorted set'}
                    </span>
                    <button
                      onClick={() => setSelected(c)}
                      className="px-2.5 py-1 rounded bg-white border border-rule text-ink text-label-md
                                 hover:bg-surface-dim/50 transition-colors inline-flex items-center gap-1
                                 group-hover:bg-spruce group-hover:text-white group-hover:border-spruce"
                    >
                      Review
                      <Icon name="arrow_forward" size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-space-lg py-space-md mt-space-sm flex items-center justify-between bg-canvas border-t border-rule">
              <span className="text-code-sm font-mono text-ink-3">Cumulative top {list.length}: <strong className="text-ink">{total}</strong></span>
              <span className="text-code-sm font-mono text-live font-semibold inline-flex items-center gap-1">
                Sub-second freshness <Icon name="bolt" size={14} />
              </span>
            </div>
          </>
        )}
      </Card>

      {/* Slide-over inspection sheet */}
      {selected && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-spruce/40 animate-[fadeIn_.15s_ease-out]"
            onClick={() => setSelected(null)}
          />
          <aside className="absolute top-0 right-0 bottom-0 w-full max-w-lg bg-white shadow-sheet flex flex-col">
            <div className="px-space-lg py-space-md bg-canvas border-b border-rule flex items-center justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-headline-md text-ink">Claim {selected.claim_id}</span>
                  <StatusChip kind="open" />
                </div>
                <span className="text-body-sm text-ink-3">Direct Policy Account • Redis live view</span>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="w-8 h-8 rounded-lg hover:bg-surface-dim/60 text-ink-2 flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-space-lg flex flex-col gap-space-lg">
              <div className="p-space-md rounded-lg bg-canvas border border-rule flex items-center justify-between">
                <div>
                  <span className="text-label-caps text-ink-3 uppercase">Claim Exposure Amount</span>
                  <div className="text-display-hero text-ink tracking-tight mt-0.5 tabular">{zar(selected.amount)}</div>
                </div>
                <div className="text-right">
                  <span className="text-label-caps text-ink-3 uppercase">View Source</span>
                  <div className="text-code-sm font-mono text-live font-bold mt-1">redis:stream</div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-bg border border-blue-200 flex items-start gap-3">
                <Icon name="info" size={18} className="text-blue-700 mt-0.5" />
                <p className="text-body-sm text-blue-800">
                  Lifecycle transitions are made in the source system. This sheet is a read-only
                  operational view — the stream propagates changes here within seconds.
                </p>
              </div>
            </div>

            <div className="px-space-lg py-space-md bg-canvas border-t border-rule flex items-center justify-end gap-space-md">
              <button
                onClick={() => setSelected(null)}
                className="px-space-md py-2 rounded-lg bg-white border border-rule-strong text-ink text-label-md shadow-sm hover:bg-surface-dim/50 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
