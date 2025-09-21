'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

import { sendVisitorNotifications } from '@/lib/notifications/visitors'
import { createClient } from '@/utils/supa-server-actions'

import {
  handleCreateVisitorRequest,
  visitorActionInitialState,
  visitorRequestFormSchema,
  type VisitorActionState,
} from './shared'
import {
  createVisitorRequestDependencies,
  getProfileById,
} from './data-access'

function parseRuleId(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export async function submitVisitorRequest(
  _prevState: VisitorActionState = visitorActionInitialState,
  formData?: FormData,
): Promise<VisitorActionState> {
  if (!formData) {
    return {
      status: 'error',
      message: 'No form data received.',
    }
  }

  const raw = {
    visitorName: formData.get('visitorName'),
    visitorEmail: formData.get('visitorEmail'),
    arrivalDate: formData.get('arrivalDate'),
    departureDate: formData.get('departureDate'),
    reason: formData.get('reason'),
    ruleId: parseRuleId(formData.get('ruleId')),
  }

  const parsed = visitorRequestFormSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Please correct the highlighted issues and try again.',
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
      message: 'You must be signed in to request overnight visitors.',
    }
  }

  const profile = await getProfileById(supabase, user.id)
  if (!profile) {
    return {
      status: 'error',
      message: 'We could not locate your profile. Please contact support.',
    }
  }

  const dependencies = createVisitorRequestDependencies(supabase, profile)

  return handleCreateVisitorRequest(
    dependencies,
    parsed.data,
    sendVisitorNotifications,
    {
      revalidatePath,
    },
  )
}
