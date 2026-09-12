import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Calls `fn` immediately, then every `intervalMs`.
 * Returns { data, error, loading, refresh }.
 *
 * The stream endpoints move every few seconds, so the UI polls rather
 * than waiting for a user action. Batch endpoints poll slowly or not
 * at all — a daily mart does not change between refreshes.
 *
 * `fn` may be null to suspend polling. Deliberately NOT in the effect
 * deps: callers often pass inline arrows, whose identity changes every
 * render. Depending on `fn` here re-armed the interval each render and
 * turned polling into a request storm (2666 requests and counting).
 * The ref keeps the latest fn; the interval stays stable.
 */
export function usePolling(fn, intervalMs) {
  const [data, setData]       = useState(null)
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(true)
  const fnRef = useRef(fn)
  fnRef.current = fn

  const refresh = useCallback(async () => {
    if (!fnRef.current) return
    try {
      const result = await fnRef.current()
      setData(result)
      setError(null)
    } catch (e) {
      // A stale attempt aborted by the fetch layer (a newer poll for the
      // same path took over) is not an outage — the replacement request
      // is already answering. Keep last-good data and error state.
      if (e?.name === 'AbortError') return
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    if (!intervalMs) return
    const id = setInterval(refresh, intervalMs)
    return () => clearInterval(id)
  }, [refresh, intervalMs])

  return { data, error, loading, refresh }
}
