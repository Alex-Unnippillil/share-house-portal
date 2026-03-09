import 'server-only'

import { redirect } from 'next/navigation'

import { fetchMemberRole } from '@/lib/data/members'
import { createClient } from '@/utils/supabase/server'

export const PRIVILEGED_ROLES = ['property_manager', 'admin'] as const

export async function requirePrivilegedAccess() {
  const supabase = await createClient()
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
