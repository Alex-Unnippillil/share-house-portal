import 'server-only'

import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'

import { fetchMemberRole } from '@/lib/data/members'
import { createSupbaseServerClientReadOnly } from '@/utils/supaone'

export const PRIVILEGED_ROLES = ['property_manager', 'admin'] as const

type PrivilegedRole = (typeof PRIVILEGED_ROLES)[number]

type PrivilegedApiAuthSuccess = {
  user: { id: string }
  role: PrivilegedRole
  supabase: Awaited<ReturnType<typeof createSupbaseServerClientReadOnly>>
}

type PrivilegedApiAuthFailure = {
  response: NextResponse<{ message: 'Unauthorized' | 'Forbidden' }>
}

export async function requirePrivilegedAccess() {
  const supabase = await createSupbaseServerClientReadOnly()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const role = await fetchMemberRole(supabase as any, user.id)

  if (!role || !PRIVILEGED_ROLES.includes(role as PrivilegedRole)) {
    redirect('/dashboard')
  }

  return { user, role }
}

export async function requirePrivilegedApiAccess(): Promise<PrivilegedApiAuthSuccess | PrivilegedApiAuthFailure> {
  const supabase = await createSupbaseServerClientReadOnly()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { response: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) }
  }

  const role = await fetchMemberRole(supabase as any, user.id)
  if (!role || !PRIVILEGED_ROLES.includes(role as PrivilegedRole)) {
    return { response: NextResponse.json({ message: 'Forbidden' }, { status: 403 }) }
  }

  return { user: { id: user.id }, role: role as PrivilegedRole, supabase }
}
