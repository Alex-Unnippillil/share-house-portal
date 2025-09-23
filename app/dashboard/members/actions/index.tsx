'use server'

import { cookies } from 'next/headers'

import { createClient } from '@/utils/supa-server-actions'
import type { TypedSupabaseClient } from '@/utils/typed-supabase-client'

import { updateMemberWithClient } from './update-member.logic'
import type { UpdateMemberInput, UpdateMemberResult } from './update-member.types'

export async function updateMemberAction(
  input: UpdateMemberInput,
): Promise<UpdateMemberResult> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore) as unknown as TypedSupabaseClient

  return updateMemberWithClient(supabase, input)
}

// Legacy placeholders retained for backwards compatibility with existing components.
export async function createMember() {
  console.warn('createMember action is not implemented yet.')
}

export async function deleteMemberById() {
  console.warn('deleteMemberById action is not implemented yet.')
}

export async function readMembers() {
  console.warn('readMembers action is not implemented yet.')
}
