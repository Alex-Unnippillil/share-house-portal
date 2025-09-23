import { type CookieOptions, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import {
  getSupabaseCookieSecurityContext,
  withSupabaseCookieDefaults,
} from '@/utils/supabase/cookie-helpers'

export function createClient(cookieStore: ReturnType<typeof cookies>) {
  const securityContext = getSupabaseCookieSecurityContext()

  const applyCookieDefaults = (options: CookieOptions) =>
    withSupabaseCookieDefaults(options, securityContext)

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          const normalized = applyCookieDefaults(options)
          cookieStore.set({ name, value, ...normalized })
        },
        remove(name: string, options: CookieOptions) {
          const normalized = applyCookieDefaults(options)
          cookieStore.set({ name, value: '', ...normalized })
        },
      },
    }
  )
}
