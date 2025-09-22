import { type CookieOptions, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { createSupabaseClientLoggingConfig } from '@/utils/supabase/logging'
import { getCurrentTraceId } from '@/utils/trace/server'

export function createClient(cookieStore: ReturnType<typeof cookies>) {
  const loggingConfig = createSupabaseClientLoggingConfig({
    traceId: getCurrentTraceId(),
    source: 'server-action',
  })

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
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
      ...loggingConfig,
    },
  )
}
