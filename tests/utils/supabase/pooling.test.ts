import { beforeEach, describe, expect, it, vi } from 'vitest'

const createServerClientMock = vi.fn(() => ({ id: Symbol('supabase-client') }))
const mockCookies = vi.fn()

const mockPoolState = {
  instances: [] as Array<{
    max: number
    maxObserved: number
    active: number
    connect: () => Promise<{ release: () => void }>
  }>,
}

vi.mock('@supabase/ssr', () => ({
  createServerClient: createServerClientMock,
}))

vi.mock('next/headers', () => ({
  cookies: mockCookies,
}))

vi.mock('pg', () => {
  class MockPool {
    public readonly options: Record<string, unknown>
    public readonly max: number
    public active = 0
    public maxObserved = 0
    private waitQueue: Array<() => void> = []

    constructor(config: Record<string, any>) {
      this.options = config
      this.max = config.max ?? 10
      mockPoolState.instances.push(this as any)
    }

    async connect() {
      if (this.active >= this.max) {
        await new Promise<void>((resolve) => this.waitQueue.push(resolve))
      }

      this.active += 1
      this.maxObserved = Math.max(this.maxObserved, this.active)
      const pool = this

      return {
        release() {
          pool.active -= 1
          const next = pool.waitQueue.shift()
          if (next) {
            next()
          }
        },
      }
    }

    async end() {
      this.active = 0
      this.waitQueue = []
    }
  }

  return { Pool: MockPool }
})

function resetEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  process.env.SUPABASE_DB_POOL_URL = 'postgres://example.supabase.co/postgres'
  process.env.SUPABASE_DB_POOL_MAX = '5'
  process.env.SUPABASE_DB_POOL_IDLE_TIMEOUT_MS = '1000'
  process.env.SUPABASE_DB_POOL_CONNECTION_TIMEOUT_MS = '500'
  process.env.SUPABASE_REST_MAX_CONNECTIONS = '6'
  process.env.SUPABASE_REST_KEEP_ALIVE_MS = '2000'
}

describe('Supabase connection pooling', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    mockCookies.mockReset()
    mockPoolState.instances.length = 0
    resetEnv()
  })

  it('reuses the server client when many requests arrive simultaneously', async () => {
    const cookieStore = {
      get: vi.fn(() => undefined),
      set: vi.fn(),
    }
    mockCookies.mockReturnValue(cookieStore as any)

    const module = await import('@/utils/supaone')
    module.__resetSupabaseServerClients()

    const calls = Array.from({ length: 24 }, () => module.createSupbaseServerClient())
    const clients = await Promise.all(calls)

    expect(createServerClientMock).toHaveBeenCalledTimes(1)
    expect(clients.every((client) => client === clients[0])).toBe(true)
  })

  it('creates isolated clients per cookie store without exceeding limits', async () => {
    const module = await import('@/utils/supaone')
    module.__resetSupabaseServerClients()

    const cookieA = { get: vi.fn(() => undefined), set: vi.fn() }
    const cookieB = { get: vi.fn(() => undefined), set: vi.fn() }

    const clientA = module.getSupabaseServerClient(cookieA as any)
    const clientB = module.getSupabaseServerClient(cookieB as any)

    expect(clientA).not.toBe(clientB)
    expect(createServerClientMock).toHaveBeenCalledTimes(2)
  })

  it('caps concurrent pg connections under load', async () => {
    const module = await import('@/utils/supabase/pool')
    await module.__resetSupabasePgPool()

    const pool = module.getSupabasePgPool({ max: 3 })
    const mockPool = mockPoolState.instances[0]!

    const operations = Array.from({ length: 18 }, async () => {
      const client = await pool.connect()
      await new Promise((resolve) => setTimeout(resolve, 0))
      client.release()
    })

    await Promise.all(operations)

    expect(mockPool.maxObserved).toBeLessThanOrEqual(3)
    expect(mockPool.max).toBe(3)
  })

  it('reuses a single pg pool instance across calls', async () => {
    const module = await import('@/utils/supabase/pool')
    await module.__resetSupabasePgPool()

    const first = module.getSupabasePgPool()
    const second = module.getSupabasePgPool()

    expect(first).toBe(second)
    expect(mockPoolState.instances.length).toBe(1)
  })
})
