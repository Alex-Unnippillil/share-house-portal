import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Agent } from 'undici'

import type { Database } from '@/lib/supabase'
import type { TypedSupabaseClient } from '@/utils/typed-supabase-client'

type CookieStore = ReturnType<typeof cookies>
type ClientMode = 'default' | 'read-only'

type RequestInitWithDispatcher = RequestInit & { dispatcher?: Agent }

const globalForSupabase = globalThis as unknown as {
  supabaseRestAgent?: Agent
}

const REST_CONNECTION_LIMIT = Number.parseInt(
  process.env.SUPABASE_REST_MAX_CONNECTIONS ?? '10',
  10
)
const REST_KEEP_ALIVE_MS = Number.parseInt(
  process.env.SUPABASE_REST_KEEP_ALIVE_MS ?? '30000',
  10
)

function getRestAgent() {
  if (!globalForSupabase.supabaseRestAgent) {
    globalForSupabase.supabaseRestAgent = new Agent({
      connections: REST_CONNECTION_LIMIT,
      pipelining: 1,
      keepAliveTimeout: REST_KEEP_ALIVE_MS,
      keepAliveMaxTimeout: REST_KEEP_ALIVE_MS,
    })
  }

  return globalForSupabase.supabaseRestAgent
}

const pooledFetch: typeof fetch = (input, init) => {
  const agent = getRestAgent()
  const finalInit: RequestInitWithDispatcher = {
    ...(init ?? {}),
    dispatcher: agent,
  }

  return fetch(input, finalInit)
}

let defaultClientCache = new WeakMap<CookieStore, TypedSupabaseClient>()
let readOnlyClientCache = new WeakMap<CookieStore, TypedSupabaseClient>()

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase environment variables are not configured')
  }

  return { url, key }
}

function buildCookieAdapter(store: CookieStore, mode: ClientMode) {
  return {
    get(name: string) {
      return store.get(name)?.value
    },
    set(name: string, value: string, options: CookieOptions) {
      if (mode === 'read-only') {
        return
      }

      const mutable = store as unknown as {
        set?: (cookie: { name: string; value: string } & CookieOptions) => void
      }

      if (typeof mutable.set === 'function') {
        try {
          mutable.set({ name, value, ...options })
        } catch {
          // Setting cookies from a server component is unsupported; ignore.
        }
      }
    },
    remove(name: string, options: CookieOptions) {
      if (mode === 'read-only') {
        return
      }

      const mutable = store as unknown as {
        set?: (cookie: { name: string; value: string } & CookieOptions) => void
      }

      if (typeof mutable.set === 'function') {
        try {
          mutable.set({ name, value: '', ...options })
        } catch {
          // Removing cookies from a server component is unsupported; ignore.
        }
      }
    },
  }
}

function getCache(mode: ClientMode) {
  return mode === 'read-only' ? readOnlyClientCache : defaultClientCache
}

function setCache(
  mode: ClientMode,
  cookieStore: CookieStore,
  client: TypedSupabaseClient
) {
  if (mode === 'read-only') {
    readOnlyClientCache.set(cookieStore, client)
  } else {
    defaultClientCache.set(cookieStore, client)
  }
}

function getOrCreateClient(
  mode: ClientMode,
  cookieStore?: CookieStore
): TypedSupabaseClient {
  const store = cookieStore ?? cookies()
  const cache = getCache(mode)
  const cached = cache.get(store)

  if (cached) {
    return cached
  }

  const { url, key } = getSupabaseEnv()
  const adapter = buildCookieAdapter(store, mode)

  const client = createServerClient<Database>(url, key, {
    global: {
      fetch: pooledFetch,
    },
    cookies: adapter,
  }) as TypedSupabaseClient

  setCache(mode, store, client)

  return client
}

export function getSupabaseServerClient(
  cookieStore?: CookieStore
): TypedSupabaseClient {
  return getOrCreateClient('default', cookieStore)
}

export function getSupabaseServerClientReadOnly(
  cookieStore?: CookieStore
): TypedSupabaseClient {
  return getOrCreateClient('read-only', cookieStore)
}

export async function createSupbaseServerClient() {
  return getSupabaseServerClient()
}

export async function createSupbaseServerClientReadOnly() {
  return getSupabaseServerClientReadOnly()
}

export function __resetSupabaseServerClients() {
  defaultClientCache = new WeakMap<CookieStore, TypedSupabaseClient>()
  readOnlyClientCache = new WeakMap<CookieStore, TypedSupabaseClient>()

  if (globalForSupabase.supabaseRestAgent) {
    void globalForSupabase.supabaseRestAgent.close()
    delete globalForSupabase.supabaseRestAgent
  }
}

export function __getSupabaseRestAgent() {
  return globalForSupabase.supabaseRestAgent
}
