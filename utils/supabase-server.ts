import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import type { Database } from '@/lib/supabase'
import { getSupabaseClientConfig } from '@/utils/supabase/env'

export default function createSupabaseServer(
  cookieStore: ReturnType<typeof cookies>
) {
  const { url, anonKey } = getSupabaseClientConfig()

  return createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}