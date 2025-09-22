import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import type { Database } from '@/lib/supabase'
import { createSupabaseClientLoggingConfig } from '@/utils/supabase/logging'
import { getCurrentTraceId } from '@/utils/trace/server'

export default function createSupabaseServer(
  cookieStore: ReturnType<typeof cookies>,
) {
  const loggingConfig = createSupabaseClientLoggingConfig({
    traceId: getCurrentTraceId(),
    source: 'server',
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
