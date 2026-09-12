// Shared shells. Every panel in the app is a Card; keeping that in one
// place means hierarchy stays consistent as sections get added.

export function Card({ title, subtitle, icon, tag, children, className = '' }) {
  return (
    <section className={`bg-white border border-rule rounded-lg shadow-card overflow-hidden ${className}`}>
      {(title || tag) && (
        <header className="flex items-start justify-between px-space-lg py-space-md gap-2 border-b border-rule">
          <div className="flex items-start gap-space-sm min-w-0">
            {icon && (
              <div className="w-8 h-8 shrink-0 rounded-lg bg-surface-dim/60 text-ink flex items-center justify-center">
                {icon}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <h2 className="text-headline-sm text-ink">{title}</h2>
              {subtitle && <p className="text-body-sm text-ink-3 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {tag}
        </header>
      )}
      {children}
    </section>
  )
}

// Small neutral pill used for contextual metadata (e.g. "Batch · daily").
export function Tag({ tone = 'neutral', children, className = '' }) {
  const tones = {
    neutral: 'bg-surface-dim/60 text-ink-2',
    live:    'bg-live/10 text-live',
    batch:   'bg-info/10 text-info',
    danger:  'bg-danger/10 text-danger',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-code-sm font-mono font-semibold px-2 py-0.5 rounded-full ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}

const CHIP_STYLES = {
  lodged:    'bg-amber-bg text-blue-800',
  assessing: 'bg-info-bg text-blue-800',
  approved:  'bg-live-bg text-blue-800',
  rejected:  'bg-danger-bg text-blue-800',
  paid:      'bg-paid-bg text-blue-800',
  open:      'bg-amber-bg text-blue-800',
  active:    'bg-live-bg text-blue-800',
}

// Claim / record status chip. `kind` is lower-cased stage name from the API.
export function StatusChip({ kind = 'open', children, dot = true }) {
  const style = CHIP_STYLES[kind?.toLowerCase()] ?? CHIP_STYLES.open
  return (
    <span className={`inline-flex items-center gap-1.5 text-label-caps uppercase px-2 py-0.5 rounded-full font-bold ${style}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {children ?? kind}
    </span>
  )
}

export function LiveDot({ className = '', up = true }) {
  return (
    <span
      className={`w-2 h-2 rounded-full shrink-0 ${up ? 'bg-live animate-pulseDot' : 'bg-danger'} ${className}`}
    />
  )
}

// Empty and error states say what to do next, not just that nothing is here.
export function Empty({ icon = 'inbox', children }) {
  return (
    <div className="px-space-lg py-8 text-center text-ink-3 text-body-md flex flex-col items-center gap-2">
      <span className="material-symbols-outlined text-ink-3/60" style={{ fontSize: 28 }} aria-hidden="true">
        {icon}
      </span>
      <span>{children}</span>
    </div>
  )
}
