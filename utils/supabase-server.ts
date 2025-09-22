import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import type { Database } from '@/lib/supabase'
import {
  createInstrumentedFetch,
  type QueryLoggingContext,
} from '@/utils/observability/query-logging'

export default function createSupabaseServer(
  cookieStore: ReturnType<typeof cookies>,
  context?: QueryLoggingContext
) {
  const instrumentationContext: QueryLoggingContext = {
    ...context,
    operation: context?.operation ?? 'server-client-readonly',
    metadata: {
      client: 'supabase-server-readonly',
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
      },
      options: {
        global: {
          fetch: createInstrumentedFetch(instrumentationContext),
        },
      },
    }
  )
}