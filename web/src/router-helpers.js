import { useEffect } from 'react'
import { usePath } from './router.js'

export { usePath }

// Declarative redirect: replace the current history entry on mount.
export function Navigate({ to, replace = true }) {
  useEffect(() => {
    const url = to.startsWith('/')
      ? to
      : (() => { const u = new URL(to, window.location.origin); return u.pathname + u.search + u.hash })()
    if (replace) window.history.replaceState({}, '', url)
    else window.history.pushState({}, '', url)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, [to, replace])
  return null
}
