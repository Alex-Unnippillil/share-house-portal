import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

import type { Database } from '@/lib/supabase'
import type {
  BuildingScopedTable,
  TypedSupabaseClient,
} from '@/utils/typed-supabase-client'

function buildServerClient(): TypedSupabaseClient {
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

export function createSupbaseServerClientReadOnly(): TypedSupabaseClient {
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

export function createSupbaseServerClient(): TypedSupabaseClient {
  return buildServerClient()
}

export function scopeQueryToBuilding<TableName extends BuildingScopedTable>(
  client: TypedSupabaseClient,
  table: TableName,
  buildingId: string
) {
  return client.from(table).eq('building_id', buildingId)
}

export async function assertTenantAccess(
  client: TypedSupabaseClient,
  buildingId: string,
  roles?: Database['public']['Enums']['user_role'][]
) {
  const allowedRoles =
    roles ?? (['resident'] as Database['public']['Enums']['user_role'][])
  const { data, error } = await client.rpc('has_building_access', {
    target_building: buildingId,
    allowed_roles: allowedRoles,
  })

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('Building access denied by RLS policies')
  }
}

export async function resolveTenantContext(
  client: TypedSupabaseClient,
  userId: string
): Promise<{ buildingId: string | null; leaseId: string | null }> {
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('default_building_id')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  if (profile?.default_building_id) {
    return { buildingId: profile.default_building_id, leaseId: null }
  }

  const { data: membership, error: membershipError } = await client
    .from('lease_residents')
    .select('building_id, lease_id')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (membershipError) {
    throw membershipError
  }

  if (membership?.building_id) {
    return { buildingId: membership.building_id, leaseId: membership.lease_id ?? null }
  }

  return { buildingId: null, leaseId: null }
}
