'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

import { createClient } from '@/utils/supa-server-actions'

export type ScanMissedChoresState = {
  success: boolean | null
  message: string
  processed: number
}

const initialState: ScanMissedChoresState = {
  success: null,
  message: '',
  processed: 0,
}

export function getInitialScanState(): ScanMissedChoresState {
  return { ...initialState }
}

export async function scanForMissedChoresAction(
  _prevState: ScanMissedChoresState
): Promise<ScanMissedChoresState> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      message: 'You need to be signed in to run the missed chore scan.',
      processed: 0,
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return {
      success: false,
      message: `Unable to verify permissions: ${profileError.message}`,
      processed: 0,
    }
  }

  if (!profile || !['property_manager', 'admin'].includes(profile.role ?? '')) {
    return {
      success: false,
      message: 'Only property managers or admins can trigger a missed chore scan.',
      processed: 0,
    }
  }

  const nowIso = new Date().toISOString()

  const { data: overdueAssignments, error: selectError } = await supabase
    .from('chore_assignments')
    .select('id')
    .eq('status', 'open')
    .lte('due_at', nowIso)

  if (selectError) {
    return {
      success: false,
      message: `Unable to check assignments: ${selectError.message}`,
      processed: 0,
    }
  }

  const overdueIds = overdueAssignments?.map((assignment) => assignment.id) ?? []

  if (overdueIds.length === 0) {
    revalidatePath('/chores')
    return {
      success: true,
      message: 'Great news! No open chores are past due right now.',
      processed: 0,
    }
  }

  const { error: updateError } = await supabase
    .from('chore_assignments')
    .update({ status: 'missed', updated_by: user.id })
    .in('id', overdueIds)

  if (updateError) {
    return {
      success: false,
      message: `Unable to update chore statuses: ${updateError.message}`,
      processed: 0,
    }
  }

  revalidatePath('/chores')

  const processedCount = overdueIds.length
  const message = `Marked ${processedCount} chore${processedCount === 1 ? '' : 's'} as missed.`

  return {
    success: true,
    message,
    processed: processedCount,
  }
}
