import { useLive } from '../context/LiveContext.jsx'
import LivePipeline  from '../components/LivePipeline.jsx'
import KpiRow        from '../components/KpiRow.jsx'
import ProvinceTable from '../components/ProvinceTable.jsx'
import OpenClaims    from '../components/OpenClaims.jsx'
import ClientLookup  from '../components/ClientLookup.jsx'
import StatusBar     from '../components/StatusBar.jsx'

export default function Dashboard() {
  const live = useLive()

  return (
    <>
      {/* Operational header telemetry bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pt-1 mb-space-lg">
        <div className="flex items-center gap-space-md">
          <span className="text-headline-lg text-ink tracking-tight">Claims Lifecycle Hub</span>
          <span className="px-2 py-0.5 rounded-full bg-surface-dim/60 text-live text-label-caps uppercase tracking-wider">
            Production Node ZA-1
          </span>
        </div>
      </div>

      <LivePipeline stages={live.stages} error={live.pipeline.error} />

      <KpiRow
        openValue={live.openValue}
        openCount={live.pipeline.error ? null : live.openCount}
        clientCount={live.clientCount}
        worst={live.worst}
        freshness={live.batchInfo}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        <div className="lg:col-span-7 flex flex-col gap-space-lg">
          <ProvinceTable rows={live.provinces} error={live.lossRatio.error} />
          <ClientLookup />
        </div>
        <div className="lg:col-span-5">
          <OpenClaims
            claims={live.claims.data?.claims}
            error={live.claims.error}
            lastEventTs={live.pipeline.data?.last_event_ts}
          />
        </div>
      </div>

      <StatusBar
        health={live.health.data}
        error={live.health.error}
        lastChecked={live.health.data ? new Date() : null}
        streamAge={live.streamAge}
      />
    </>
  )
}
