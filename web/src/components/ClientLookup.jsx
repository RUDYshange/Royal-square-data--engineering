import { useState } from 'react'
import { Card, Tag } from './Primitives.jsx'
import { Icon } from './Icons.jsx'
import { api, zar, num, pct } from '../api.js'

export default function ClientLookup() {
  const [id, setId]         = useState('')
  const [client, setClient] = useState(null)
  const [status, setStatus] = useState(null)   // null | 'loading' | error string
  const [busy, setBusy]     = useState(false)

  async function lookUp() {
    if (!id) { setStatus('Enter a client ID between 1 and 500.'); return }
    setBusy(true); setStatus(null)
    try {
      const data = await api.client(id)
      setClient(data.client ?? data)
    } catch {
      setClient(null)
      setStatus(`No record for client ${id}. The daily mart may not be built yet — run make batch.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card
      title="Client & Policy Fast Lookup"
      subtitle="Direct operational query across the daily mart"
      icon={<Icon name="person_search" size={20} />}
      tag={<Tag tone="batch">Batch</Tag>}
    >
      <div className="px-space-lg pt-space-md flex flex-col gap-space-md">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 text-[18px]" aria-hidden="true">badge</span>
            <input
              type="number" min="1" max="500" value={id}
              onChange={e => setId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && lookUp()}
              placeholder="Client ID, 1 to 500"
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-canvas border border-rule-strong
                         text-body-md text-ink placeholder:text-ink-3 focus:bg-white
                         focus:outline-none focus:ring-1 focus:ring-live transition-colors"
            />
          </div>
          <button
            onClick={lookUp} disabled={busy}
            className="inline-flex items-center gap-1.5 px-space-lg py-2 rounded-lg bg-spruce text-white
                       text-label-md shadow-sm hover:bg-spruce-hover disabled:opacity-50
                       active:scale-[0.98] transition-all"
          >
            <Icon name="search" size={16} />
            {busy ? 'Looking up' : 'Lookup'}
          </button>
        </div>

        {status && <p className="text-body-sm text-ink-3">{status}</p>}
      </div>

      {client && (
        <div className="mx-space-lg my-space-md p-space-md rounded-lg bg-canvas border border-rule">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-spruce text-white flex items-center justify-center text-label-md font-bold">
                {String(client.client_id ?? id).slice(0, 2)}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-label-md text-ink font-bold">Client {client.client_id ?? id}</span>
                  {client.value_tier && (
                    <span className="px-2 py-0.5 rounded bg-live/10 text-live text-label-caps uppercase font-bold">{client.value_tier}</span>
                  )}
                </div>
                <span className="text-code-sm font-mono text-ink-3">Policyholder record • postgres:batch_mart</span>
              </div>
            </div>
            <span className="text-code-sm font-mono text-ink-3 hidden sm:inline">Daily mart</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { v: num(client.policy_count),     l: 'Policies' },
              { v: zar(client.lifetime_premium), l: 'Lifetime premium', tone: 'text-blue-700' },
              { v: pct(client.loss_ratio),       l: 'Loss ratio' },
            ].map((s, i) => (
              <div key={s.l} className="p-3 rounded-lg bg-white border border-rule flex flex-col">
                <span className="text-label-caps text-ink-3 uppercase">{s.l}</span>
                <span className={`text-metric-xl font-bold tabular mt-1 ${s.tone ?? 'text-ink'}`}>{s.v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!client && !status && (
        <p className="px-space-lg pb-space-lg pt-1 text-body-md text-ink-3">
          Search any client to see their policies, premium history and claims ratio.
        </p>
      )}
    </Card>
  )
}
