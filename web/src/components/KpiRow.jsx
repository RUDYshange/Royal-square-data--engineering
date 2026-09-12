import { Icon } from './Icons.jsx'
import { LiveDot } from './Primitives.jsx'
import { zar } from '../api.js'

function Sparkline() {
  return (
    <div className="mt-space-md pt-space-xs">
      <svg className="w-full h-8 overflow-visible" fill="none" preserveAspectRatio="none" viewBox="0 0 200 32" aria-hidden="true">
        <path className="text-live" d="M0 24 Q 30 18, 60 22 T 120 14 T 160 8 T 200 4" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
        <path className="text-live/20" d="M0 24 Q 30 18, 60 22 T 120 14 T 160 8 T 200 4 L 200 32 L 0 32 Z" fill="currentColor" />
      </svg>
    </div>
  )
}

export default function KpiRow({ openValue, openCount, clientCount, worst, freshness }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md mb-space-lg">
      {/* Open claims value */}
      <div className="flex flex-col justify-between p-space-lg rounded-lg bg-white border border-rule shadow-card hover:shadow-raise transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-label-caps text-ink-3 uppercase tracking-wider">Open Claims Value</span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-canvas text-live text-code-sm font-mono font-semibold">
            <Icon name="trending_up" size={14} />
            Live
          </span>
        </div>
        <div className="mt-space-md">
          <div className="text-display-hero text-ink tracking-tight tabular">{openValue}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-body-sm text-ink-3">
              <strong className="text-ink font-semibold">{openCount != null ? `${openCount} awaiting` : '—'}</strong> assessment
            </span>
          </div>
        </div>
        <Sparkline />
      </div>

      {/* Active clients */}
      <div className="flex flex-col justify-between p-space-lg rounded-lg bg-white border border-rule shadow-card hover:shadow-raise transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-label-caps text-ink-3 uppercase tracking-wider">Active Client Policies</span>
          <Icon name="verified_user" size={20} className="text-ink-3" />
        </div>
        <div className="mt-space-md">
          <div className="text-display-hero text-ink tracking-tight tabular">{clientCount}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-live" />
            <span className="text-body-sm text-ink-3">Daily mart active • <span className="text-live font-semibold font-mono text-code-sm">Batch</span></span>
          </div>
        </div>
        <div className="mt-space-md flex items-center justify-between p-2 rounded-lg bg-canvas text-code-sm font-mono">
          <span className="text-ink-3">Counted in the mart</span>
          <span className="flex items-center gap-1 font-semibold text-ink"><LiveDot />reconciled</span>
        </div>
      </div>

      {/* Highest loss ratio */}
      <div className="flex flex-col justify-between p-space-lg rounded-lg bg-white border border-rule shadow-card hover:shadow-raise transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-label-caps text-ink-3 uppercase tracking-wider">Highest Loss Ratio</span>
          {worst.province && (
            <span className="px-2 py-0.5 rounded bg-danger-bg text-blue-800 text-code-sm font-mono font-bold uppercase">{worst.province}</span>
          )}
        </div>
        <div className="mt-space-md">
          <div className="text-display-hero text-danger tracking-tight tabular">{worst.ratio}</div>
          <div className="w-full bg-surface-dim/70 h-2 rounded-full mt-2 overflow-hidden">
            <div className="bg-danger h-full rounded-full transition-[width] duration-700"
                 style={{ width: worst.rawRatio != null ? `${Math.min(100, worst.rawRatio * 100)}%` : '0%' }} />
          </div>
        </div>
        <div className="mt-space-md flex items-center justify-between text-code-sm font-mono text-ink-3">
          <span>Target benchmark: &lt; 60%</span>
          <span className={worst.rawRatio >= 0.6 ? 'text-danger font-semibold' : 'text-live font-semibold'}>
            {worst.rawRatio >= 0.6 ? 'above target' : 'within target'}
          </span>
        </div>
      </div>

      {/* Last batch run */}
      <div className="flex flex-col justify-between p-space-lg rounded-lg bg-white border border-rule shadow-card hover:shadow-raise transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-label-caps text-ink-3 uppercase tracking-wider">Batch Processing Run</span>
          <span className="flex items-center gap-1 text-code-sm font-mono text-ink-3">
            <span className="w-2 h-2 rounded-full bg-live animate-pulseDot" />Idle
          </span>
        </div>
        <div className="mt-space-md">
          <div className="text-headline-lg text-ink tracking-tight">{freshness.when}</div>
          <div className="text-body-sm text-ink-3 mt-1">{freshness.detail}</div>
        </div>
        <div className="mt-space-md flex items-center justify-between p-2 rounded-lg bg-canvas text-code-sm font-mono">
          <span className="text-ink-3">Rebuilt daily by Airflow</span>
          <Icon name="history" size={16} className="text-ink-3" />
        </div>
      </div>
    </div>
  )
}
