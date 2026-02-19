import { type CookieOptions, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { getSupabaseAnonKey, getSupabaseUrl } from '@/utils/supabase/env'

export function createClient(cookieStore: ReturnType<typeof cookies>) {
  return createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}
