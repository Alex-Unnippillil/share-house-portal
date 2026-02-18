import 'server-only'

import { redirect } from 'next/navigation'

import { fetchMemberRole } from '@/lib/data/members'
import { createSupbaseServerClientReadOnly } from '@/utils/supaone'

export const PRIVILEGED_ROLES = ['property_manager', 'admin'] as const

export async function requirePrivilegedAccess() {
  const supabase = await createSupbaseServerClientReadOnly()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const role = await fetchMemberRole(supabase as any, user.id)

  if (!role || !PRIVILEGED_ROLES.includes(role as (typeof PRIVILEGED_ROLES)[number])) {
    redirect('/dashboard')
  }

  return { user, role }
}
