import type { Session } from '@supabase/supabase-js'
import { ApplicationError } from '@/lib/errors'
import type { Database } from '@/lib/supabase'
import { createSupbaseServerClientReadOnly } from '@/utils/supaone'
import type { TypedSupabaseClient } from '@/utils/typed-supabase-client'

export type RoleKey = Database['public']['Tables']['roles']['Row']['key']

export type SessionWithRoles = Session & {
  roles: RoleKey[]
  user: Session['user'] & {
    app_metadata: Session['user']['app_metadata'] & { roles?: RoleKey[] }
    user_metadata: Session['user']['user_metadata'] & { roles?: RoleKey[] }
  }
}

function dedupeRoles(roles: RoleKey[]): RoleKey[] {
  return Array.from(new Set(roles))
}

async function resolveMemberRoles(
  client: TypedSupabaseClient,
  memberId: string
): Promise<RoleKey[]> {
  const { data, error } = await client
    .from('member_roles')
    .select('role')
    .eq('member_id', memberId)

  if (error) {
    throw new ApplicationError('Failed to load member roles', { cause: error })
  }

  if (!data) {
    return []
  }

  return dedupeRoles(data.map((entry) => entry.role as RoleKey))
}

function attachRoles(session: Session, roles: RoleKey[]): SessionWithRoles {
  const normalized = dedupeRoles(roles)

  return {
    ...session,
    roles: normalized,
    user: {
      ...session.user,
      app_metadata: {
        ...session.user.app_metadata,
        roles: normalized,
      },
      user_metadata: {
        ...session.user.user_metadata,
        roles: normalized,
      },
    },
  }
}

export async function getSessionWithRoles(
  client?: TypedSupabaseClient
): Promise<SessionWithRoles | null> {
  const supabase =
    client ?? ((await createSupbaseServerClientReadOnly()) as TypedSupabaseClient)

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    throw new ApplicationError('Failed to load session', { cause: error })
  }

  if (!session) {
    return null
  }

  const roles = await resolveMemberRoles(supabase, session.user.id)

  return attachRoles(session, roles)
}

function normaliseRequiredRoles(required: RoleKey | RoleKey[]): RoleKey[] {
  return Array.isArray(required) ? required : [required]
}

export function hasRequiredRole(
  session: SessionWithRoles | null,
  required: RoleKey | RoleKey[]
): boolean {
  if (!session) {
    return false
  }

  const ownedRoles = new Set(session.roles)
  return normaliseRequiredRoles(required).some((role) => ownedRoles.has(role))
}

export function assertHasRole(
  session: SessionWithRoles | null,
  required: RoleKey | RoleKey[],
  message = 'You do not have permission to access this resource.'
): asserts session is SessionWithRoles {
  if (!hasRequiredRole(session, required)) {
    throw new ApplicationError(message, { requiredRoles: normaliseRequiredRoles(required) })
  }
}
