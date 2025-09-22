import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

import type { Database } from '@/lib/supabase'

type SupabaseServerInstrumentation = {
  initCount: number
  lastInitializedAt?: number
}

const globalForSupabase = globalThis as unknown as {
  supabaseServerClient?: SupabaseClient<Database>
  supabaseServerInstrumentation?: SupabaseServerInstrumentation
}

function getInstrumentation(): SupabaseServerInstrumentation {
  if (!globalForSupabase.supabaseServerInstrumentation) {
    globalForSupabase.supabaseServerInstrumentation = { initCount: 0 }
  }
  return globalForSupabase.supabaseServerInstrumentation
}

function createSupabaseServerClient(): SupabaseClient<Database> {
  const instrumentation = getInstrumentation()
  instrumentation.initCount += 1
  instrumentation.lastInitializedAt = Date.now()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          try {
            return cookies().get(name)?.value
          } catch {
            return undefined
          }
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            const cookieStore = cookies()
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            const cookieStore = cookies()
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export function getSupabaseServerClient(): SupabaseClient<Database> {
  if (!globalForSupabase.supabaseServerClient) {
    globalForSupabase.supabaseServerClient = createSupabaseServerClient()
  }

  return globalForSupabase.supabaseServerClient
}

export function getSupabaseServerClientTrace(): SupabaseServerInstrumentation {
  return { ...getInstrumentation() }
}

export const createClient = getSupabaseServerClient
