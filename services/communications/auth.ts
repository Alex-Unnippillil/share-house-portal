import type { User } from '@supabase/supabase-js'
import type { TypedSupabaseClient } from '@/utils/typed-supabase-client'
import type { RequestContext } from './types'
import { HttpError } from './errors'

interface ProfileRow {
  role?: string | null
  email?: string | null
}

export async function getRequestContext(
  supabase: TypedSupabaseClient,
): Promise<RequestContext> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new HttpError(401, 'Authentication required', error)
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .maybeSingle<ProfileRow>()

  if (profileError) {
    throw new HttpError(500, 'Failed to resolve profile', profileError)
  }

  const role = (profile?.role ?? 'user') as RequestContext['role']

  return {
    userId: user.id,
    role,
    email: profile?.email ?? user.email,
  }
}

export function requireRole(context: RequestContext, roles: string[]) {
  if (!roles.includes(context.role)) {
    throw new HttpError(403, 'Insufficient permissions', {
      role: context.role,
      required: roles,
    })
  }
}

export function assertAuthenticated(user: User | null) {
  if (!user) {
    throw new HttpError(401, 'Authentication required')
  }
}

export function isAdmin(context: RequestContext) {
  return context.role === 'admin'
}
