'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createSupbaseServerClient } from '@/utils/supaone'
import type { TypedSupabaseClient } from '@/utils/typed-supabase-client'

interface ActionResult {
  success: boolean
  message?: string
  error?: string
}

const amenityFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, { message: 'Amenity name is required.' }),
  description: z.string().trim().max(1000).optional(),
  rules: z.string().trim().max(2000).optional(),
  isActive: z.string().optional(),
})

const reservationStatusSchema = z.object({
  reservationId: z.string().uuid(),
  status: z.enum(['pending', 'approved', 'denied', 'cancelled']),
})

async function ensureStaffAccess(supabase: TypedSupabaseClient, userId: string | undefined) {
  if (!userId) {
    return false
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('Failed to verify staff permissions', error)
    return false
  }

  return data?.role === 'admin' || data?.role === 'staff'
}

function normalizeAmenityPayload(values: z.infer<typeof amenityFormSchema>) {
  return {
    id: values.id,
    name: values.name,
    description: values.description && values.description.length > 0 ? values.description : null,
    rules: values.rules && values.rules.length > 0 ? values.rules : null,
    is_active:
      values.isActive === undefined
        ? true
        : ['true', 'on', '1', 'yes'].includes(values.isActive.toLowerCase()),
  }
}

export async function createAmenityAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to manage amenities.' }
  }

  if (!(await ensureStaffAccess(supabase, user.id))) {
    return { success: false, error: 'Only staff members can manage amenities.' }
  }

  const parsed = amenityFormSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') ?? undefined,
    rules: formData.get('rules') ?? undefined,
    isActive: formData.get('is_active')?.toString(),
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors.map((issue) => issue.message).join(' ') }
  }

  const payload = normalizeAmenityPayload(parsed.data)

  const { error } = await supabase.from('amenities').insert({
    name: payload.name,
    description: payload.description,
    rules: payload.rules,
    is_active: payload.is_active,
  })

  if (error) {
    console.error('Failed to create amenity', error)
    return { success: false, error: 'Unable to create amenity. Please try again.' }
  }

  revalidatePath('/dashboard/amenities')
  return { success: true, message: 'Amenity created successfully.' }
}

export async function updateAmenityAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to manage amenities.' }
  }

  if (!(await ensureStaffAccess(supabase, user.id))) {
    return { success: false, error: 'Only staff members can manage amenities.' }
  }

  const parsed = amenityFormSchema.safeParse({
    id: formData.get('id') ?? undefined,
    name: formData.get('name'),
    description: formData.get('description') ?? undefined,
    rules: formData.get('rules') ?? undefined,
    isActive: formData.get('is_active')?.toString(),
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors.map((issue) => issue.message).join(' ') }
  }

  const payload = normalizeAmenityPayload(parsed.data)

  if (!payload.id) {
    return { success: false, error: 'Amenity ID is required to update a record.' }
  }

  const { error } = await supabase
    .from('amenities')
    .update({
      name: payload.name,
      description: payload.description,
      rules: payload.rules,
      is_active: payload.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payload.id)

  if (error) {
    console.error('Failed to update amenity', error)
    return { success: false, error: 'Unable to update amenity. Please try again.' }
  }

  revalidatePath('/dashboard/amenities')
  return { success: true, message: 'Amenity updated successfully.' }
}

export async function updateReservationStatusAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to manage reservations.' }
  }

  if (!(await ensureStaffAccess(supabase, user.id))) {
    return { success: false, error: 'Only staff members can manage reservations.' }
  }

  const parsed = reservationStatusSchema.safeParse({
    reservationId: formData.get('reservation_id'),
    status: formData.get('status'),
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors.map((issue) => issue.message).join(' ') }
  }

  const { error } = await supabase
    .from('amenity_reservations')
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.reservationId)

  if (error) {
    console.error('Failed to update reservation status', error)
    return { success: false, error: 'Unable to update reservation status. Please try again.' }
  }

  revalidatePath('/dashboard/amenities')
  return { success: true, message: 'Reservation updated successfully.' }
}
