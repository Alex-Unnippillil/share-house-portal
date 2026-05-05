import 'server-only'

import { redirect } from 'next/navigation'

import { fetchMemberRole } from '@/lib/data/members'
import { createSupbaseServerClientReadOnly } from '@/utils/supaone'
import { isPrivilegedRole, type TypedSupabaseClient } from '@/utils/typed-supabase-client'

export async function requirePrivilegedAccess() {
  const supabase = (await createSupbaseServerClientReadOnly()) as TypedSupabaseClient
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const role = await fetchMemberRole(supabase, user.id)

  if (!isPrivilegedRole(role)) {
    redirect('/dashboard')
  }

  return { user, role }
}
