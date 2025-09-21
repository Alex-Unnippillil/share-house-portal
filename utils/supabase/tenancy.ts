import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase'

export type TypedSupabaseClient = SupabaseClient<Database>
export type BuildingRole = Database['public']['Enums']['user_role_type']

type Tables = Database['public']['Tables']
export type BuildingScopedTable = {
  [Key in keyof Tables]: 'building_id' extends keyof Tables[Key]['Row'] ? Key : never
}[keyof Tables]

export function createBuildingScopedQuery(
  client: TypedSupabaseClient,
  buildingId: string
) {
  return <TableName extends BuildingScopedTable>(table: TableName) =>
    client.from(table).eq('building_id', buildingId)
}

export async function assertTenantAccess(
  client: TypedSupabaseClient,
  buildingId: string,
  allowedRoles: BuildingRole[] = []
): Promise<BuildingRole[]> {
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser()

  if (userError) {
    throw new Error(`Unable to load authenticated user: ${userError.message}`)
  }

  if (!user) {
    throw new Error('Authentication required to access building scoped data')
  }

  const { data, error } = await client
    .from('user_roles')
    .select('role')
    .eq('building_id', buildingId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(`Unable to verify tenancy membership: ${error.message}`)
  }

  const roles = (data ?? []).map((entry) => entry.role)

  if (roles.includes('platform_admin')) {
    return roles
  }

  if (allowedRoles.length === 0) {
    if (roles.length === 0) {
      throw new Error('User is not assigned to the requested building')
    }
    return roles
  }

  if (!roles.some((role) => allowedRoles.includes(role))) {
    throw new Error('User does not hold one of the required roles for this building')
  }

  return roles
}
