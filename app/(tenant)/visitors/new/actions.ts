'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { z } from 'zod'

import { buildPgDateRange } from '@/lib/date-range'
import type { Database } from '@/lib/supabase'
import { createClient } from '@/utils/supa-server-actions'

export type VisitorRequestActionState = {
  success: boolean
  message: string | null
  errors: Record<string, string[]>
}

const formSchema = z.object({
  guestName: z.string().trim().min(2, { message: 'Guest name is required.' }),
  startDate: z.coerce.date({ invalid_type_error: 'Select a valid start date.' }),
  endDate: z.coerce.date({ invalid_type_error: 'Select a valid end date.' }),
  reason: z.string().trim().min(5, {
    message: 'Share a short note explaining the visit (at least 5 characters).',
  }),
})

function normalizeFieldErrors(errors: z.typeToFlattenedError<z.infer<typeof formSchema>>['fieldErrors']) {
  const result: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(errors)) {
    if (value && value.length > 0) {
      result[key] = value
    }
  }
  return result
}

export async function submitVisitorRequest(
  _prevState: VisitorRequestActionState,
  formData: FormData
): Promise<VisitorRequestActionState> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      message: 'You must be signed in to submit a visitor request.',
      errors: { general: ['Please log in to continue.'] },
    }
  }

  const parsed = formSchema.safeParse({
    guestName: formData.get('guestName'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
    reason: formData.get('reason'),
  })

  if (!parsed.success) {
    return {
      success: false,
      message: 'Please double-check the highlighted fields.',
      errors: normalizeFieldErrors(parsed.error.flatten().fieldErrors),
    }
  }

  const { guestName, startDate, endDate, reason } = parsed.data

  if (endDate < startDate) {
    return {
      success: false,
      message: 'End date must be after the start date.',
      errors: {
        endDate: ['End date must come after the start date.'],
      },
    }
  }

  const dateRange = buildPgDateRange(startDate, endDate)

  const { error } = await supabase
    .from('visitor_requests' satisfies keyof Database['public']['Tables'])
    .insert({
      member_id: user.id,
      guest_name: guestName,
      date_range: dateRange,
      reason,
      status: 'pending',
    })

  if (error) {
    console.error('Failed to submit visitor request', error)
    return {
      success: false,
      message: 'Something went wrong while saving your request.',
      errors: { general: ['Please try again or contact support.'] },
    }
  }

  revalidatePath('/visitors')
  revalidatePath('/dashboard/visitors')

  return {
    success: true,
    message: 'Visitor request submitted for review.',
    errors: {},
  }
}
