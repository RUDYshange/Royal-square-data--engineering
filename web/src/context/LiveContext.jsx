import { createContext, useContext, useMemo } from 'react'
import { api, zar, num, pct } from '../api.js'
import { usePolling } from '../hooks/usePolling.js'

// One polling session for the whole shell. Previously every page re-created
// its own usePolling calls; now the streams are shared so switching routes
// neither restarts the clock nor re-fetches unnecessarily.
const LiveContext = createContext(null)

export function LiveProvider({ children }) {
  const health    = usePolling(api.health,     15000)
  const pipeline  = usePolling(api.pipeline,    4000)
  const claims    = usePolling(() => api.openClaims(6), 6000)
  const lossRatio = usePolling(api.lossRatio,  60000)
  const freshness = usePolling(api.freshness,  60000)

  const value = useMemo(() => {
    const stages = pipeline.data?.stages ?? {}
    const openCount = (stages.lodged ?? 0) + (stages.assessing ?? 0)
    const provinces = lossRatio.data?.rows ?? []

    const worst = provinces.length
      ? [...provinces].sort((a, b) => (b.loss_ratio || 0) - (a.loss_ratio || 0))[0]
      : null

    // Redis returns everything as a string; coerce before doing date maths.
    const streamAge = pipeline.data?.last_event_ts
      ? Math.max(0, Math.round((Date.now() - Number(pipeline.data.last_event_ts)) / 1000))
      : null

    const batch = freshness.data?.batch
    const batchInfo = {
      when:   batch?.last_run ?? 'Not run yet',
      detail: batch?.last_run ? `${num(batch.rows)} clients in the mart` : 'Run: make batch',
    }

    return {
      health, pipeline, claims, lossRatio, freshness,
      stages,
      openCount,
      openValue: claims.data?.claims?.length
        ? zar(claims.data.claims.reduce((a, c) => a + Number(c.amount || 0), 0))
        : '—',
      provinces,
      worst: worst
        ? { ratio: pct(worst.loss_ratio), province: worst.province, rawRatio: worst.loss_ratio }
        : { ratio: '—', province: null, rawRatio: null },
      clientCount: provinces.length
        ? num(provinces.reduce((a, r) => a + Number(r.clients || 0), 0))
        : '—',
      batchInfo,
      streamAge,
      async refreshAll() {
        await Promise.all([
          health.refresh(), pipeline.refresh(), claims.refresh(),
          lossRatio.refresh(), freshness.refresh(),
        ])
      },
    }
  }, [health, pipeline, claims, lossRatio, freshness])

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>
}

export function useLive() {
  const ctx = useContext(LiveContext)
  if (!ctx) throw new Error('useLive must be used inside <LiveProvider>')
  return ctx
}
