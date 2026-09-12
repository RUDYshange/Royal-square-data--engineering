import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// api.js reads import.meta.env at module scope; vitest defines it natively.
const { api, STALE_MS } = await import('./api.js')

// Minimal Response stand-in.
const jsonResponse = body => ({ ok: true, status: 200, json: async () => body })

describe('api layer anti-pile-up guarantees', () => {
  beforeEach(() => { vi.restoreAllMocks() })
  afterEach(() => { vi.useRealTimers() })

  it('1. DEDUP: identical concurrent GETs share one network fetch', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: 1 }))
    vi.stubGlobal('fetch', fetchMock)

    const [a, b, c] = await Promise.all([api.pipeline(), api.pipeline(), api.pipeline()])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(a).toEqual(b)
    expect(b).toEqual(c)
  })

  it('2. sequential calls after completion each fetch again (no over-caching)', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ n: 1 }))
    vi.stubGlobal('fetch', fetchMock)

    await api.health()
    await api.health()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('3. STALE ABORT: a hung request is aborted and replaced by the next caller', async () => {
    vi.useFakeTimers()

    let releaseFirst
    // A mock that honours the abort signal exactly like real fetch.
    const fetchMock = vi.fn()
      .mockImplementationOnce((_url, opts = {}) => new Promise((resolve, reject) => {
        const abortErr = Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
        if (opts.signal?.aborted) return reject(abortErr)
        opts.signal?.addEventListener('abort', () => reject(abortErr), { once: true })
        releaseFirst = () => resolve(jsonResponse({ hung: true }))
      }))
      .mockImplementationOnce(async () => jsonResponse({ ok: 2 }))   // replacement
    vi.stubGlobal('fetch', fetchMock)

    const firstCall = api.pipeline()

    // Advance past the staleness window, then let a new poll tick arrive.
    vi.advanceTimersByTime(STALE_MS + 1)
    const secondCall = api.pipeline()

    // The replacement resolves on its own.
    await expect(secondCall).resolves.toEqual({ ok: 2 })
    expect(fetchMock).toHaveBeenCalledTimes(2)

    // The hung first request was aborted (rejects AbortError once released).
    releaseFirst()
    await expect(firstCall).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('4. usePolling integration: poll interval + dedup produce ~1 req per tick', async () => {
    const { renderHook } = await import('@testing-library/react')
    const { usePolling } = await import('./hooks/usePolling.js')

    const fetchMock = vi.fn(async () => jsonResponse({ stages: { lodged: 33 } }))
    vi.stubGlobal('fetch', fetchMock)

    vi.useFakeTimers()
    const { result } = renderHook(() => usePolling(api.pipeline, 4000))

    await vi.advanceTimersByTimeAsync(12500)   // initial + 3 ticks

    // 4 polls, and because each resolves instantly, dedup collapses any
    // overlap: at most one fetch per tick, never more.
    expect(fetchMock.mock.calls.length).toBe(4)
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(4)
    expect(result.current.data).toEqual({ stages: { lodged: 33 } })
    expect(result.current.error).toBeNull()
  })
})
