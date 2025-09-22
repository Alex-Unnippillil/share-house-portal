import { type CookieOptions, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import {
  createInstrumentedFetch,
  type QueryLoggingContext,
} from '@/utils/observability/query-logging'

export function createClient(
  cookieStore: ReturnType<typeof cookies>,
  context?: QueryLoggingContext
) {
  const instrumentationContext: QueryLoggingContext = {
    ...context,
    operation: context?.operation ?? 'action',
    metadata: {
      client: 'supa-server-action',
      ...(context?.metadata ?? {}),
    },
  }

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
      options: {
        global: {
          fetch: createInstrumentedFetch(instrumentationContext),
        },
      },
    }
  )
}
