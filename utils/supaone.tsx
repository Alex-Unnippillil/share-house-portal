import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase'
import {
  assertTenantAccess,
  createBuildingScopedQuery,
  type BuildingRole,
  type TypedSupabaseClient,
} from '@/utils/supabase/tenancy'

export type TenantScopedClient = {
  client: TypedSupabaseClient
  buildingId: string
  scope: ReturnType<typeof createBuildingScopedQuery>
}

export async function createSupbaseServerClientReadOnly() {
  const cookieStore = cookies()

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

export async function createSupbaseServerClient() {
  const cookieStore = cookies()

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

export async function createTenantScopedClient(
  buildingId: string,
  allowedRoles: BuildingRole[] = []
): Promise<TenantScopedClient> {
  const client = await createSupbaseServerClient()

  await assertTenantAccess(client, buildingId, allowedRoles)

  return {
    client,
    buildingId,
    scope: createBuildingScopedQuery(client, buildingId),
  }
}

export { assertTenantAccess }
