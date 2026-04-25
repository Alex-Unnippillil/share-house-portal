import 'server-only'

import { redirect } from 'next/navigation'

import { fetchMemberRole } from '@/lib/data/members'
import { migrateLegacyRole, type AppRole } from '@/lib/roles'
import { createSupbaseServerClientReadOnly } from '@/utils/supaone'

export const PRIVILEGED_ROLES: AppRole[] = ['property_manager', 'admin']

export async function requirePrivilegedAccess() {
  const supabase = await createSupbaseServerClientReadOnly()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const role = migrateLegacyRole(await fetchMemberRole(supabase as any, user.id))

  if (!role || !PRIVILEGED_ROLES.includes(role)) {
    redirect('/dashboard')
  }

  return { user, role }
}
