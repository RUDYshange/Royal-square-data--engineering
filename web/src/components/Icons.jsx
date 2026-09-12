// One glyph set for the whole app: Material Symbols Outlined, loaded once in
// index.html. No per-icon SVGs to maintain; sizes come from the caller.
export function Icon({ name, size = 16, className = '', fill = false }) {
  return (
    <span
      className={`material-symbols-outlined select-none ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
        width: size,
        height: size,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}
