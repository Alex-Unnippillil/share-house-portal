'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

import type { Database } from '@/lib/supabase'
import { createSupbaseServerClient } from '@/utils/supaone'

export type CompleteChoreInput = {
  assignmentId: string
  proofUrl?: string | null
}

export async function completeChore({ assignmentId, proofUrl = null }: CompleteChoreInput) {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    return { error: userError.message }
  }

  if (!user) {
    return { error: 'You must be signed in to update a chore.' }
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from('chore_assignments')
    .select('id, status, assigned_to, credit_value')
    .eq('id', assignmentId)
    .maybeSingle()

  if (assignmentError) {
    return { error: assignmentError.message }
  }

  if (!assignment) {
    return { error: 'Chore assignment not found.' }
  }

  if (assignment.assigned_to !== user.id) {
    return { error: 'You are not allowed to update this assignment.' }
  }

  if (assignment.status === 'completed') {
    revalidatePath(`/chores/${assignmentId}`)
    return { data: assignment, message: 'This chore has already been completed.' }
  }

  const adminClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  const updateTimestamp = new Date().toISOString()

  const { data: updatedAssignment, error: updateError } = await adminClient
    .from('chore_assignments')
    .update({
      status: 'completed',
      proof_url: proofUrl,
      completed_at: updateTimestamp,
      updated_at: updateTimestamp,
    })
    .eq('id', assignmentId)
    .select('id, status, credit_value, proof_url, completed_at, assigned_to')
    .maybeSingle()

  if (updateError) {
    return { error: updateError.message }
  }

  if (!updatedAssignment) {
    return { error: 'Unable to update the assignment.' }
  }

  if (assignment.credit_value) {
    const { data: member, error: memberError } = await adminClient
      .from('members_table')
      .select('credit_balance')
      .eq('member_id', user.id)
      .maybeSingle()

    if (memberError) {
      return { error: memberError.message }
    }

    if (!member) {
      return { error: 'Member record could not be located for credit update.' }
    }

    const currentBalance = member.credit_balance ?? 0

    const { error: balanceError } = await adminClient
      .from('members_table')
      .update({ credit_balance: currentBalance + assignment.credit_value })
      .eq('member_id', user.id)

    if (balanceError) {
      return { error: balanceError.message }
    }
  }

  revalidatePath(`/chores/${assignmentId}`)

  return { data: updatedAssignment }
}
