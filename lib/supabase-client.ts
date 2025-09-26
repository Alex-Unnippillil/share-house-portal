import { createBrowserClient as createSupabaseBrowserClient, createServerClient as createSupabaseServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

import type { Database } from './supabase'

type CookieStore = Pick<ReturnType<typeof cookies>, 'get' | 'set'> & {
  delete?: ReturnType<typeof cookies>['delete']
}

type CookieHandler = {
  get(name: string): { value: string } | undefined
  set(options: { name: string; value: string } & CookieOptions): void
  delete?: (name: string, options?: CookieOptions) => void
}

type ResolvedCookieStore = CookieStore | CookieHandler

export type TypedSupabaseClient = SupabaseClient<Database>

let browserClient: TypedSupabaseClient | undefined
let adminClient: TypedSupabaseClient | undefined

function getEnvValue(key: string): string {
  const value = process.env[key]

  if (!value) {
    throw new Error(`Missing environment variable: ${key}`)
  }

  return value
}

function resolveCookieStore(cookieStore?: ResolvedCookieStore): ResolvedCookieStore {
  if (cookieStore) {
    return cookieStore
  }

  return cookies()
}

export function createBrowserClient(): TypedSupabaseClient {
  if (!browserClient) {
    const supabaseUrl = getEnvValue('NEXT_PUBLIC_SUPABASE_URL')
    const anonKey = getEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY')

    browserClient = createSupabaseBrowserClient<Database>(supabaseUrl, anonKey)
  }

  return browserClient
}

export function createServerClient(cookieStore?: ResolvedCookieStore): TypedSupabaseClient {
  const store = resolveCookieStore(cookieStore)
  const supabaseUrl = getEnvValue('NEXT_PUBLIC_SUPABASE_URL')
  const anonKey = getEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  return createSupabaseServerClient<Database>(supabaseUrl, anonKey, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          store.set({ name, value, ...options })
        } catch (error) {
          // Ignored - Next.js will throw if attempting to mutate cookies in a server component.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          if (store.delete) {
            store.delete(name, options)
            return
          }

          store.set({ name, value: '', ...options })
        } catch (error) {
          try {
            store.set({ name, value: '', ...options })
          } catch (_) {
            // Ignore when cookies cannot be mutated in the current context.
          }
        }
      },
    },
  })
}

export function createAdminClient(): TypedSupabaseClient {
  if (!adminClient) {
    const supabaseUrl = getEnvValue('NEXT_PUBLIC_SUPABASE_URL')
    const serviceRoleKey = getEnvValue('SUPABASE_SERVICE_ROLE_KEY')

    adminClient = createSupabaseAdminClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  return adminClient
}

export function createAdminAuthClient() {
  return createAdminClient().auth.admin
}
