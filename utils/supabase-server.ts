import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import type { Database } from '@/lib/supabase'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/utils/supabase/env'

export default function createSupabaseServer(
  cookieStore: ReturnType<typeof cookies>
) {
  return createServerClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}