import 'server-only'

import { redirect } from 'next/navigation'

import { isPrivilegedRole } from '@/lib/auth-rbac'
import { fetchMemberRole } from '@/lib/data/members'
import { createSupbaseServerClientReadOnly } from '@/utils/supaone'

export async function requirePrivilegedAccess() {
  const supabase = await createSupbaseServerClientReadOnly()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const role = await fetchMemberRole(supabase as any, user.id)

  if (!isPrivilegedRole(role)) {
    redirect('/dashboard')
  }

  return { user, role }
}
