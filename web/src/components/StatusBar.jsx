import { LiveDot } from './Primitives.jsx'

function Dot({ up }) {
  return <LiveDot up={up} />
}

// Bottom telemetry bar: health + stream age, mirroring the design's
// "operational status pill bar".
export default function StatusBar({ health, error, lastChecked, streamAge }) {
  const checks = health?.checks ?? {}

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between
                    bg-white border border-rule rounded-lg shadow-card px-space-lg py-space-md
                    mt-space-lg gap-2 text-code-sm font-mono text-ink-3">
      <div className="flex items-center gap-space-md flex-wrap">
        <div className="flex items-center gap-2">
          <Dot up={!error} />
          <span className={`font-semibold ${error ? 'text-danger' : 'text-ink'}`}>
            {error ? 'API unreachable on port 8000' : `Checked ${lastChecked?.toLocaleTimeString('en-ZA') ?? '—'}`}
          </span>
        </div>
        <span className="text-surface-dim">•</span>
        <div className="flex items-center gap-1.5"><Dot up={checks.redis === 'up'} />Live store connected</div>
        <span className="text-surface-dim">•</span>
        <div className="flex items-center gap-1.5"><Dot up={checks.postgres === 'up'} />Warehouse synced</div>
      </div>
      <div className="flex items-center gap-space-md">
        {streamAge != null && (
          <>
            <span className={streamAge < 120 ? 'text-live font-semibold' : 'text-blue-700 font-semibold'}>
              Last event {streamAge < 60 ? `${streamAge}s` : `${Math.round(streamAge / 60)}m`} ago
            </span>
            <span className="text-surface-dim">•</span>
          </>
        )}
        <span className="hidden md:inline">Worker: batch-srv-04</span>
        <span className="hidden md:inline text-surface-dim">•</span>
        <span className="px-2 py-0.5 rounded bg-canvas text-ink font-semibold">ops@new-mutual.co.za</span>
      </div>
    </div>
  )
}
