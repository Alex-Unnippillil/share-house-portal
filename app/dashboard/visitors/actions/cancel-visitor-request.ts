'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

import { sendVisitorNotifications } from '@/lib/notifications/visitors'
import { createClient } from '@/utils/supa-server-actions'

import {
  cancelVisitorRequestSchema,
  handleCancelVisitorRequest,
  type CancelVisitorRequestInput,
  type VisitorActionState,
} from './shared'
import { createCancelDependencies, getProfileById } from './data-access'

export async function cancelVisitorRequest(
  input: CancelVisitorRequestInput,
): Promise<VisitorActionState> {
  const parsed = cancelVisitorRequestSchema.safeParse(input)
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Unable to cancel this visit. Please try again.',
      issues: parsed.error.flatten().fieldErrors,
    }
  }

  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    return {
      status: 'error',
      message: userError.message,
    }
  }

  if (!user) {
    return {
      status: 'error',
      message: 'You must be signed in to cancel a visitor stay.',
    }
  }

  const profile = await getProfileById(supabase, user.id)
  if (!profile) {
    return {
      status: 'error',
      message: 'We could not load your profile.',
    }
  }

  const dependencies = createCancelDependencies(supabase, profile)

  return handleCancelVisitorRequest(
    dependencies,
    parsed.data,
    sendVisitorNotifications,
    {
      revalidatePath,
    },
  )
}
