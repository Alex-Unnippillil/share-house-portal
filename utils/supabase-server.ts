import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { siteConfig } from '@/config/site'
import type { Database } from '@/lib/supabase'

export default function createSupabaseServer(
  cookieStore: ReturnType<typeof cookies>
) {
  return createServerClient<Database>(
    siteConfig.thirdParty.supabase.baseUrl!,
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