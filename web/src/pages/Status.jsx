import { useLive } from '../context/LiveContext.jsx'
import { Card, Tag, LiveDot, Empty } from '../components/Primitives.jsx'
import { Icon } from '../components/Icons.jsx'
import { num } from '../api.js'

function CheckRow({ name, detail, up, icon }) {
  return (
    <div className="flex items-center justify-between px-space-lg py-3.5 border-b border-rule last:border-b-0">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${up ? 'bg-live/10 text-live' : 'bg-danger/10 text-danger'}`}>
          <Icon name={icon} size={18} />
        </div>
        <div className="flex flex-col">
          <span className="text-body-lg font-semibold text-ink">{name}</span>
          <span className="text-code-sm font-mono text-ink-3">{detail}</span>
        </div>
      </div>
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-caps uppercase font-bold
                        ${up ? 'bg-live-bg text-blue-800' : 'bg-danger-bg text-blue-800'}`}>
        <LiveDot up={up} />{up ? 'Operational' : 'Down'}
      </span>
    </div>
  )
}

function age(n) {
  if (n == null) return '—'
  if (n < 60) return `${n}s ago`
  if (n < 3600) return `${Math.round(n / 60)}m ago`
  return `${Math.round(n / 3600)}h ago`
}

export default function Status() {
  const live = useLive()
  const checks = live.health.data?.checks ?? {}
  const stages = live.stages
  const total = Object.values(stages).reduce((a, b) => a + b, 0)

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pt-1 mb-space-lg">
        <div className="flex items-center gap-space-md">
          <span className="text-headline-lg text-ink tracking-tight">System Status</span>
          <span className={`px-2 py-0.5 rounded-full text-label-caps uppercase tracking-wider font-bold
                            ${live.health.error
                              ? 'bg-danger-bg text-blue-800'
                              : live.health.data?.status === 'healthy'
                                ? 'bg-live-bg text-blue-800'
                                : 'bg-amber-bg text-blue-800'}`}>
            {live.health.error ? 'API unreachable' : live.health.data?.status ?? 'checking…'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg items-start">
        <Card title="Dependencies" subtitle="Checked every 15 seconds from the browser"
              icon={<Icon name="dns" size={20} />}
              tag={<Tag tone={live.health.error ? 'danger' : 'live'}>{live.health.error ? 'offline' : 'polled'}</Tag>}>
          {!live.health.data && !live.health.error ? (
            <Empty icon="hourglass_empty">Querying /health…</Empty>
          ) : (
            <>
              <CheckRow name="Redis — live store" icon="bolt"
                        up={checks.redis === 'up'}
                        detail={checks.redis === 'up' ? 'Claims stages, open sorted set, last event ts' : String(checks.redis ?? 'no data')} />
              <CheckRow name="Postgres — warehouse" icon="database"
                        up={checks.postgres === 'up'}
                        detail={checks.postgres === 'up' ? 'analytics schema, batch marts' : String(checks.postgres ?? 'no data')} />
              <div className="px-space-lg py-3 flex items-center justify-between text-code-sm font-mono text-ink-3">
                <span>Last checked</span>
                <span className="text-ink">{live.health.data?.checked_at?.slice(11, 19) ?? '—'} UTC</span>
              </div>
            </>
          )}
        </Card>

        <Card title="Stream telemetry" subtitle="Kafka → consumer → Redis path"
              icon={<Icon name="stream" size={20} />}
              tag={<Tag tone={live.pipeline.error ? 'danger' : 'live'}>
                <LiveDot up={!live.pipeline.error} />{live.pipeline.error ? 'offline' : 'streaming'}
              </Tag>}>
          {live.pipeline.error ? (
            <Empty icon="sync_problem">
              No stream data. Start the consumer: <span className="font-mono text-code-sm text-ink bg-surface-dim/60 px-1.5 py-0.5 rounded">docker compose up -d stream-consumer</span>
            </Empty>
          ) : (
            <div className="px-space-lg py-space-md grid grid-cols-2 gap-space-md">
              {[
                { l: 'Last event',        v: age(live.streamAge) },
                { l: 'Pipeline items',    v: num(total) },
                { l: 'Open (lodged + assessing)', v: num(live.openCount) },
                { l: 'Open claims feed',  v: `${live.claims.data?.claims?.length ?? 0} shown` },
              ].map(x => (
                <div key={x.l} className="p-3 rounded-lg bg-canvas border border-rule flex flex-col">
                  <span className="text-label-caps text-ink-3 uppercase">{x.l}</span>
                  <span className="text-metric-xl font-bold tabular text-ink mt-1">{x.v}</span>
                </div>
              ))}
              <div className="col-span-2 p-3 rounded-lg bg-canvas border border-rule text-code-sm font-mono text-ink-3">
                served_at {live.pipeline.data?.served_at?.slice(11, 19) ?? '—'} · source {live.pipeline.data?.source ?? '—'} · freshness {live.pipeline.data?.freshness ?? '—'}
              </div>
            </div>
          )}
        </Card>

        <Card title="Batch pipeline" subtitle="Spark → dbt mart freshness"
              icon={<Icon name="calendar_clock" size={20} />}
              tag={<Tag tone="batch">Batch</Tag>}
              className="lg:col-span-2">
          {live.freshness.error ? (
            <Empty icon="sync_problem">
              Batch endpoints unavailable — the analytics mart has not been built. Run <span className="font-mono text-code-sm text-ink bg-surface-dim/60 px-1.5 py-0.5 rounded">make batch</span>.
            </Empty>
          ) : (
            <div className="px-space-lg py-space-md flex flex-wrap items-center gap-space-lg text-code-sm font-mono text-ink-3">
              <span>Last run: <strong className="text-ink">{live.batchInfo.when}</strong></span>
              <span className="text-surface-dim">•</span>
              <span>Mart rows: <strong className="text-ink">{live.batchInfo.detail}</strong></span>
              <span className="text-surface-dim">•</span>
              <span>Rebuilt daily by Airflow · <strong className="text-ink">dbt run</strong> applies models</span>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
