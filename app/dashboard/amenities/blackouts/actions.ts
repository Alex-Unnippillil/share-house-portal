'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createActionClient } from '@/utils/supabase/actions'
import {
  buildBlackoutConflictMessage,
  ensureAmenityIsBookable,
  type AmenityBlackout,
} from '@/lib/amenities/blackouts'
import { BookingBlackoutError } from '@/lib/errors'

export type BlackoutFormState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  issues?: Record<string, string[]>
}

export const initialBlackoutFormState: BlackoutFormState = {
  status: 'idle',
  message: undefined,
  issues: undefined,
}

const blackoutSchema = z
  .object({
    amenityId: z.string().min(1, 'Select an amenity.'),
    startsAt: z.coerce.date({
      errorMap: () => ({ message: 'Provide a valid start date and time.' }),
    }),
    endsAt: z.coerce.date({
      errorMap: () => ({ message: 'Provide a valid end date and time.' }),
    }),
    reason: z
      .string()
      .min(3, 'Share a short reason for the blackout.')
      .max(280, 'Keep the blackout reason under 280 characters.'),
  })
  .refine((data) => data.endsAt > data.startsAt, {
    message: 'The blackout end time must be after the start time.',
    path: ['endsAt'],
  })

export async function createBlackoutAction(
  prevState: BlackoutFormState,
  formData: FormData
): Promise<BlackoutFormState> {
  const parsed = blackoutSchema.safeParse({
    amenityId: formData.get('amenityId'),
    startsAt: formData.get('startsAt'),
    endsAt: formData.get('endsAt'),
    reason: formData.get('reason'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Please correct the highlighted fields and try again.',
      issues: parsed.error.flatten().fieldErrors,
    }
  }

  const { amenityId, startsAt, endsAt, reason } = parsed.data
  const supabase = await createActionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      status: 'error',
      message: 'You must be signed in to manage amenity blackouts.',
    }
  }

  const startsAtIso = startsAt.toISOString()
  const endsAtIso = endsAt.toISOString()

  const { error } = await supabase.from('amenity_blackouts').insert({
    amenity_id: amenityId,
    starts_at: startsAtIso,
    ends_at: endsAtIso,
    reason,
    created_by: user.id,
  })

  if (error) {
    return {
      status: 'error',
      message: 'Unable to save the blackout. Please try again.',
    }
  }

  revalidatePath('/dashboard/amenities/blackouts')

  return {
    status: 'success',
    message: 'Blackout scheduled successfully.',
  }
}

export async function deleteBlackoutAction(blackoutId: string) {
  const supabase = await createActionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to manage amenity blackouts.' }
  }

  const { error } = await supabase
    .from('amenity_blackouts')
    .delete()
    .eq('id', blackoutId)

  if (error) {
    return { error: 'Failed to remove the blackout. Please try again.' }
  }

  revalidatePath('/dashboard/amenities/blackouts')

  return { success: true as const }
}

export async function checkBookingAgainstBlackouts(payload: {
  amenityId: string
  startsAt: Date
  endsAt: Date
}) {
  const supabase = await createActionClient()

  try {
    await ensureAmenityIsBookable(supabase, payload)
    return { ok: true as const }
  } catch (error) {
    if (error instanceof BookingBlackoutError) {
      const blackout = error.blackout as AmenityBlackout | undefined
      return {
        ok: false as const,
        message: blackout
          ? buildBlackoutConflictMessage(blackout)
          : error.message,
      }
    }

    throw error
  }
}
