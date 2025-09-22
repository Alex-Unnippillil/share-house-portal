'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

import type { Database } from '@/lib/supabase'
import { createClient } from '@/utils/supa-server-actions'

interface ProposeSwapInput {
  assignmentId: string
  responderId: string
  message?: string
}

interface RespondToSwapInput {
  swapId: string
  response: 'accepted' | 'declined'
}

type TypedChoreAssignment = Database['public']['Tables']['chore_assignments']['Row']
type TypedChoreSwap = Database['public']['Tables']['chore_swaps']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']

function formatName(profile?: Pick<ProfileRow, 'full_name'> | null) {
  return profile?.full_name || 'A roommate'
}

async function getCurrentUser() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { supabase, user: null as const }
  }

  return { supabase, user }
}

export async function proposeChoreSwap({ assignmentId, responderId, message }: ProposeSwapInput) {
  const { supabase, user } = await getCurrentUser()
  if (!user) {
    return { success: false, error: 'You must be signed in to request a chore swap.' }
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from('chore_assignments')
    .select('id, assigned_to, unit_id')
    .eq('id', assignmentId)
    .single<TypedChoreAssignment>()

  if (assignmentError || !assignment) {
    return { success: false, error: 'Unable to locate the selected chore assignment.' }
  }

  if (assignment.assigned_to !== user.id) {
    return { success: false, error: 'Only the current assignee can propose a swap for this chore.' }
  }

  if (responderId === user.id) {
    return { success: false, error: 'Choose a different roommate to complete a swap.' }
  }

  const { data: responderProfile } = await supabase
    .from('profiles')
    .select('id, unit_id')
    .eq('id', responderId)
    .single<Pick<ProfileRow, 'id' | 'unit_id'>>()

  if (!responderProfile) {
    return { success: false, error: 'The selected roommate could not be found.' }
  }

  if (assignment.unit_id && responderProfile.unit_id && assignment.unit_id !== responderProfile.unit_id) {
    return { success: false, error: 'You can only request swaps with roommates from the same unit.' }
  }

  const { count: pendingCount } = await supabase
    .from('chore_swaps')
    .select('id', { count: 'exact', head: true })
    .eq('assignment_id', assignmentId)
    .eq('status', 'pending')

  if ((pendingCount || 0) > 0) {
    return { success: false, error: 'There is already a pending swap request for this chore.' }
  }

  const { error: insertError } = await supabase.from('chore_swaps').insert({
    assignment_id: assignmentId,
    requester_id: user.id,
    responder_id: responderId,
    message: message?.trim() ? message.trim() : null,
  })

  if (insertError) {
    return { success: false, error: 'Failed to create the swap request. Please try again.' }
  }

  revalidatePath('/chores')
  return { success: true }
}

async function postSwapMessage(
  supabase: ReturnType<typeof createClient>,
  params: {
    assignment: Pick<TypedChoreAssignment, 'id' | 'title' | 'unit_id'>
    swap: Pick<TypedChoreSwap, 'id' | 'requester_id' | 'responder_id'>
  }
) {
  if (!params.assignment.unit_id) {
    return
  }

  const [{ data: requesterProfile }, { data: responderProfile }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', params.swap.requester_id)
      .single<Pick<ProfileRow, 'id' | 'full_name'>>(),
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', params.swap.responder_id)
      .single<Pick<ProfileRow, 'id' | 'full_name'>>(),
  ])

  const requesterName = formatName(requesterProfile)
  const responderName = formatName(responderProfile)

  const messageBody = `${responderName} accepted ${requesterName}'s swap for “${params.assignment.title}”.`

  const { error: messageError } = await supabase.from('messages').insert({
    unit_id: params.assignment.unit_id,
    channel: 'chores',
    author_id: params.swap.responder_id,
    body: messageBody,
    message_type: 'system',
    metadata: {
      assignment_id: params.assignment.id,
      swap_id: params.swap.id,
      requester_id: params.swap.requester_id,
      responder_id: params.swap.responder_id,
    },
  })

  if (messageError) {
    console.error('Failed to post swap message', messageError)
  }
}

export async function respondToChoreSwap({ swapId, response }: RespondToSwapInput) {
  const { supabase, user } = await getCurrentUser()
  if (!user) {
    return { success: false, error: 'You must be signed in to respond to a chore swap.' }
  }

  const { data: swap, error: swapError } = await supabase
    .from('chore_swaps')
    .select('*')
    .eq('id', swapId)
    .single<TypedChoreSwap>()

  if (swapError || !swap) {
    return { success: false, error: 'Unable to locate the requested swap.' }
  }

  if (swap.responder_id !== user.id) {
    return { success: false, error: 'Only the invited roommate can respond to this swap.' }
  }

  if (swap.status !== 'pending') {
    return { success: false, error: 'This swap has already been processed.' }
  }

  const { error: updateSwapError } = await supabase
    .from('chore_swaps')
    .update({
      status: response,
      responded_at: new Date().toISOString(),
    })
    .eq('id', swapId)

  if (updateSwapError) {
    return { success: false, error: 'Could not update the swap status. Please try again.' }
  }

  if (response === 'accepted') {
    const { data: assignment, error: assignmentError } = await supabase
      .from('chore_assignments')
      .update({ assigned_to: swap.responder_id })
      .eq('id', swap.assignment_id)
      .select('id, title, unit_id')
      .single<Pick<TypedChoreAssignment, 'id' | 'title' | 'unit_id'>>()

    if (assignmentError || !assignment) {
      return { success: false, error: 'Swap accepted, but the chore could not be reassigned.' }
    }

    await postSwapMessage(supabase, { assignment, swap })
  }

  revalidatePath('/chores')
  return { success: true }
}
