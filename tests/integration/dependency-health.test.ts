import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const baseEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://supabase.example.co',
  SUPABASE_SERVICE_ROLE_KEY: 'supabase-key',
  STRIPE_SECRET_KEY: 'stripe-key',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
  CALCOM_BASE_URL: 'https://cal.example.com',
  CALCOM_API_KEY: 'cal-api-key',
  DOCUMENSO_BASE_URL: 'https://documenso.example.com',
  DOCUMENSO_API_KEY: 'documenso-api-key',
}

type ImportTarget = typeof import('@/lib/operations/dependency-health')

async function loadModule(): Promise<ImportTarget> {
  return import('@/lib/operations/dependency-health')
}

beforeEach(() => {
  vi.resetModules()
  Object.assign(process.env, baseEnv)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('dependency health probes', () => {
  it('reports healthy providers with response status in message', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    const { getDependencyHealth, getReadinessSummary, clearDependencyHealthCacheForTests } = await loadModule()
    clearDependencyHealthCacheForTests()

    const dependencies = await getDependencyHealth()
    const summary = await getReadinessSummary()

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(summary.status).toBe('healthy')
    expect(dependencies.every((dependency) => dependency.status === 'healthy')).toBe(true)
    expect(dependencies[0]?.message).toContain('response status=200')
  })

  it('classifies timeout failures as down', async () => {
    vi.useFakeTimers()

    const fetchMock = vi.fn((url: string, options: RequestInit) => {
      if (url.includes('api.stripe.com')) {
        return new Promise((_, reject) => {
          const signal = options.signal as AbortSignal
          signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        })
      }

      return Promise.resolve({ status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { getDependencyHealth, clearDependencyHealthCacheForTests } = await loadModule()
    clearDependencyHealthCacheForTests()

    const pending = getDependencyHealth()
    await vi.advanceTimersByTimeAsync(2_100)
    const dependencies = await pending
    const stripe = dependencies.find((dependency) => dependency.name === 'stripe')

    expect(stripe).toMatchObject({ status: 'down' })
    expect(stripe?.message).toContain('timed out')
  })

  it('classifies auth failures as degraded and caches short-term results', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/v2/me')) {
        return Promise.resolve({ status: 401 })
      }

      return Promise.resolve({ status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { getDependencyHealth, clearDependencyHealthCacheForTests } = await loadModule()
    clearDependencyHealthCacheForTests()

    const first = await getDependencyHealth()
    const second = await getDependencyHealth()
    const calcom = first.find((dependency) => dependency.name === 'calcom')

    expect(calcom).toMatchObject({ status: 'degraded' })
    expect(calcom?.message).toContain('authentication failed')
    expect(second).toEqual(first)
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })
})
