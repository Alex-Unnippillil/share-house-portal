'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

import { sendVisitorNotifications } from '@/lib/notifications/visitors'
import { createClient } from '@/utils/supa-server-actions'

import {
  handleResolveVisitorRequest,
  resolveVisitorRequestSchema,
  type ResolveVisitorRequestInput,
  type VisitorActionState,
} from './shared'
import { createResolveDependencies, getProfileById } from './data-access'

export async function resolveVisitorRequest(
  input: ResolveVisitorRequestInput,
): Promise<VisitorActionState> {
  const parsed = resolveVisitorRequestSchema.safeParse(input)
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Unable to update this visitor request. Please try again.',
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
      message: 'You must be signed in to perform this action.',
    }
  }

  const profile = await getProfileById(supabase, user.id)
  if (!profile) {
    return {
      status: 'error',
      message: 'We could not load your profile.',
    }
  }

  const dependencies = createResolveDependencies(supabase, profile)

  return handleResolveVisitorRequest(
    dependencies,
    parsed.data,
    sendVisitorNotifications,
    {
      revalidatePath,
    },
  )
}
