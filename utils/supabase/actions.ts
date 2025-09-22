'use server'; // Ensure this runs only on the server

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

import type { Database } from '@/lib/supabase'
import {
  createInstrumentedFetch,
  type QueryLoggingContext,
} from '@/utils/observability/query-logging'

export function createActionClient(context?: QueryLoggingContext) {
  const cookieStore = cookies()
  const instrumentationContext: QueryLoggingContext = {
    ...context,
    operation: context?.operation ?? 'action',
    metadata: {
      client: 'server-action',
      ...(context?.metadata ?? {}),
    },
  }

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