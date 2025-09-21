import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase'
import type { TypedSupabaseClient } from '@/utils/typed-supabase-client'

export default function useSupabaseServer(
  cookieStore: ReturnType<typeof cookies>
): TypedSupabaseClient {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}