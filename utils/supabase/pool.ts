import { Pool, type PoolConfig } from 'pg'

type PoolOverrides = Partial<PoolConfig>

type GlobalWithPool = typeof globalThis & {
  __supabasePgPool?: Pool
}

const globalWithPool = globalThis as GlobalWithPool

function resolveConnectionString() {
  const connectionString =
    process.env.SUPABASE_DB_POOL_URL ?? process.env.SUPABASE_DB_URL

  if (!connectionString) {
    throw new Error(
      'Missing SUPABASE_DB_POOL_URL or SUPABASE_DB_URL environment variable'
    )
  }

  return connectionString
}

function resolvePoolConfig(overrides: PoolOverrides = {}): PoolConfig {
  const max = Number.parseInt(process.env.SUPABASE_DB_POOL_MAX ?? '10', 10)
  const idleTimeoutMillis = Number.parseInt(
    process.env.SUPABASE_DB_POOL_IDLE_TIMEOUT_MS ?? '30000',
    10
  )
  const connectionTimeoutMillis = Number.parseInt(
    process.env.SUPABASE_DB_POOL_CONNECTION_TIMEOUT_MS ?? '2000',
    10
  )

  return {
    connectionString: resolveConnectionString(),
    max,
    idleTimeoutMillis,
    connectionTimeoutMillis,
    ...overrides,
  }
}

export function getSupabasePgPool(overrides: PoolOverrides = {}) {
  if (!globalWithPool.__supabasePgPool) {
    globalWithPool.__supabasePgPool = new Pool(resolvePoolConfig(overrides))
  }

  return globalWithPool.__supabasePgPool
}

export async function __resetSupabasePgPool() {
  if (globalWithPool.__supabasePgPool) {
    await globalWithPool.__supabasePgPool.end().catch(() => undefined)
    delete globalWithPool.__supabasePgPool
  }
}
