import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

import type { Database } from '@/lib/supabase'

export type TypedSupabaseClient = SupabaseClient<Database>

let browserClient: TypedSupabaseClient | undefined

export function getSupabaseBrowserClient(): TypedSupabaseClient {
  if (browserClient) {
    return browserClient
  }

  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  return browserClient
}

export function getSupabaseServerActionClient(
  cookieStore: ReturnType<typeof cookies>,
): TypedSupabaseClient {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Ignored when invoked from a server component without mutable cookies
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Ignored when invoked from a server component without mutable cookies
          }
        },
      },
    },
  )
}

export function getSupabaseServerClient(): TypedSupabaseClient {
  const cookieStore = cookies()
  return getSupabaseServerActionClient(cookieStore)
}
