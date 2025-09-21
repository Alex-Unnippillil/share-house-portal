import { type CookieOptions, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import type { Database } from '@/lib/supabase'
import type { TypedSupabaseClient } from '@/utils/typed-supabase-client'
import { assertTenantAccess } from '@/utils/supaone'

export function createClient(
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
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}

export async function createTenantScopedClient(buildingId: string): Promise<TypedSupabaseClient> {
  const cookieStore = cookies()
  const client = createClient(cookieStore)
  await assertTenantAccess(client, buildingId)
  return client
}
