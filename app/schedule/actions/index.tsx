import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { formatISO, isPast } from 'date-fns'
import { z } from 'zod'

import { createClient } from '@/utils/supa-server-actions'
import { assertTenantAccess, resolveTenantContext } from '@/utils/supaone'
import { createGoogleCalendarEvent } from '@/lib/calendar-service'

const scheduleSchema = z
  .object({
    amenityId: z.string({ invalid_type_error: 'Amenity is required.' }).uuid({
      message: 'Select an amenity to reserve.',
    }),
    startTime: z
      .coerce.date({
        errorMap: () => ({ message: 'Invalid format for start date/time.' }),
      })
      .refine((date) => !isPast(date), {
        message: 'The selected start time appears to be in the past.',
      }),
    endTime: z.coerce.date({
      errorMap: () => ({ message: 'Invalid format for end date/time.' }),
    }),
    userEmail: z.string().email({ message: 'Invalid user email.' }),
    userName: z.string().min(1, { message: 'User name cannot be empty.' }),
    summary: z.string().min(1, { message: 'Meeting summary cannot be empty.' }),
    description: z.string().optional(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: 'End time must be after start time.',
    path: ['endTime'],
  })

type ActionResult = {
  message: string | null
  error: string | null
  success: boolean
  googleEventLink?: string | null
}

export async function scheduleMeetingAction(
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      message: null,
      error: 'You must be logged in to book an amenity.',
      googleEventLink: null,
    }
  }

  const rawData = {
    amenityId: formData.get('amenityId'),
    startTime: formData.get('startTime'),
    endTime: formData.get('endTime'),
    userEmail: formData.get('userEmail'),
    userName: formData.get('userName'),
    summary: formData.get('summary'),
    description: formData.get('description'),
  }

  const validationResult = scheduleSchema.safeParse(rawData)

  if (!validationResult.success) {
    const errorMessages = Object.values(
      validationResult.error.flatten().fieldErrors
    )
      .map((errors) => errors?.join('. '))
      .filter(Boolean)
      .join(' ')

    return {
      success: false,
      message: null,
      error: errorMessages || 'Invalid form data provided.',
      googleEventLink: null,
    }
  }

  const validatedData = validationResult.data

  if (validatedData.userEmail !== user.email) {
    return {
      success: false,
      message: null,
      error: 'User email mismatch.',
      googleEventLink: null,
    }
  }

  const tenantContext = await resolveTenantContext(supabase, user.id)

  if (!tenantContext.buildingId) {
    return {
      success: false,
      message: null,
      error: 'Unable to determine building context for this reservation.',
      googleEventLink: null,
    }
  }

  await assertTenantAccess(supabase, tenantContext.buildingId, [
    'resident',
    'property_manager',
    'building_staff',
  ])

  const { data: amenity, error: amenityError } = await supabase
    .from('amenities')
    .select('id, name, building_id')
    .eq('id', validatedData.amenityId)
    .maybeSingle()

  if (amenityError) {
    throw amenityError
  }

  if (!amenity || amenity.building_id !== tenantContext.buildingId) {
    return {
      success: false,
      message: null,
      error: 'Selected amenity is not available for your building.',
      googleEventLink: null,
    }
  }

  let leaseId = tenantContext.leaseId

  if (!leaseId) {
    const { data: leaseMembership, error: leaseError } = await supabase
      .from('lease_residents')
      .select('lease_id')
      .eq('profile_id', user.id)
      .eq('building_id', tenantContext.buildingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (leaseError) {
      throw leaseError
    }

    leaseId = leaseMembership?.lease_id ?? null
  }

  try {
    const calendarResult = await createGoogleCalendarEvent({
      startTime: formatISO(validatedData.startTime),
      endTime: formatISO(validatedData.endTime),
      attendeeEmail: validatedData.userEmail,
      attendeeName: validatedData.userName,
      summary: validatedData.summary,
      description:
        validatedData.description ||
        `Amenity booking for ${amenity.name} at ${validatedData.userEmail}`,
    })

    if (!calendarResult.success || !calendarResult.eventId) {
      const errorMessage =
        calendarResult.error || 'Failed to create Google Calendar event.'

      return {
        success: false,
        message: null,
        error: errorMessage,
        googleEventLink: null,
      }
    }

    const { error: bookingError } = await supabase.from('amenity_bookings').insert({
      building_id: tenantContext.buildingId,
      amenity_id: amenity.id,
      lease_id: leaseId,
      profile_id: user.id,
      starts_at: validatedData.startTime,
      ends_at: validatedData.endTime,
      status: 'pending',
      notes: validatedData.description ?? null,
    })

    if (bookingError) {
      throw bookingError
    }

    revalidatePath('/schedule')

    return {
      success: true,
      message: `Reservation requested for ${amenity.name}.`,
      error: null,
      googleEventLink: calendarResult.link,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.'

    return {
      success: false,
      message: null,
      error: message,
      googleEventLink: null,
    }
  }
}
