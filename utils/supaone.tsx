import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"

import type { Database } from '@/lib/supabase'
import { createSupabaseClientLoggingConfig } from '@/utils/supabase/logging'
import { getCurrentTraceId } from '@/utils/trace/server'
import type { TypedSupabaseClient } from '@/utils/typed-supabase-client'

export async function createSupbaseServerClientReadOnly(): Promise<TypedSupabaseClient> {
  const cookieStore = cookies()
  const loggingConfig = createSupabaseClientLoggingConfig({
    traceId: getCurrentTraceId(),
    source: 'server-readonly',
  })

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
      ...loggingConfig,
    },
  )
}

export async function createSupbaseServerClient(): Promise<TypedSupabaseClient> {
  const cookieStore = cookies()
  const loggingConfig = createSupabaseClientLoggingConfig({
    traceId: getCurrentTraceId(),
    source: 'server-readwrite',
  })

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options })
        },
      },
      ...loggingConfig,
    },
  )
}
