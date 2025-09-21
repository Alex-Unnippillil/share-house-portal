import { type CookieOptions, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase'
import {
  assertTenantAccess,
  createBuildingScopedQuery,
  type BuildingRole,
} from '@/utils/supabase/tenancy'

export function createClient(cookieStore: ReturnType<typeof cookies>) {
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

export async function createTenantScopedActionClient(
  buildingId: string,
  allowedRoles: BuildingRole[] = []
) {
  const client = createClient(cookies())
  await assertTenantAccess(client, buildingId, allowedRoles)

  return {
    client,
    buildingId,
    scope: createBuildingScopedQuery(client, buildingId),
  }
}

export { assertTenantAccess }
