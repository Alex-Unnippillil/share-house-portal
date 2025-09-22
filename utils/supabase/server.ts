import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

import {
  createInstrumentedFetch,
  type QueryLoggingContext,
} from '@/utils/observability/query-logging'

export function createClient(context?: QueryLoggingContext) {
  const cookieStore = cookies()
  const instrumentationContext: QueryLoggingContext = {
    ...context,
    operation: context?.operation ?? 'server-client',
    metadata: {
      client: 'supabase-server',
      ...(context?.metadata ?? {}),
    },
  }

  return createServerClient(
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
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      options: {
        global: {
          fetch: createInstrumentedFetch(instrumentationContext),
        },
      },
    }
  )
}