'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/utils/supa-server-actions'
import type { Amenity, AmenityReservation, TypedSupabaseClient } from '@/utils/typed-supabase-client'

const amenitySchema = z.object({
  name: z.string().min(2, 'Name must be at least two characters.'),
  description: z.string().optional(),
  rules: z.string().optional(),
})

const amenityUpdateSchema = amenitySchema.extend({
  id: z.string().uuid(),
  is_active: z.boolean().optional(),
})

const amenityStatusSchema = z.object({
  id: z.string().uuid(),
  is_active: z.boolean(),
})

const reservationStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'approved', 'denied', 'cancelled']),
})

function getSupabaseClient(): TypedSupabaseClient {
  const cookieStore = cookies()
  return createClient(cookieStore)
}

async function ensureStaff(client: TypedSupabaseClient) {
  const {
    data: { user },
    error,
  } = await client.auth.getUser()

  if (error || !user) {
    throw new Error('Authentication is required.')
  }

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  if (!profile || !['admin', 'staff'].includes(profile.role ?? '')) {
    throw new Error('Only staff members may manage amenities.')
  }

  return user
}

export type AmenityWithReservations = Amenity & {
  reservations: AmenityReservation[]
}

export async function getAmenityManagementData(): Promise<AmenityWithReservations[]> {
  const supabase = getSupabaseClient()
  await ensureStaff(supabase)

  const { data, error } = await supabase
    .from('amenities')
    .select('*, amenity_reservations(*)')
    .order('name', { ascending: true })

  if (error) {
    console.error('Failed to load amenity management data', error)
    return []
  }

  return (
    data?.map((record) => ({
      ...(record as Amenity),
      reservations: ((record as any).amenity_reservations ?? []) as AmenityReservation[],
    })) ?? []
  )
}

export async function createAmenityAction(input: z.infer<typeof amenitySchema>) {
  const supabase = getSupabaseClient()
  await ensureStaff(supabase)
  const payload = amenitySchema.parse(input)

  const { error } = await supabase.from('amenities').insert(payload)

  if (error) {
    console.error('Failed to create amenity', error)
    throw new Error('Unable to create amenity. Please try again.')
  }

  revalidatePath('/dashboard/amenities')
  revalidatePath('/amenities')
}

export async function updateAmenityAction(input: z.infer<typeof amenityUpdateSchema>) {
  const supabase = getSupabaseClient()
  await ensureStaff(supabase)
  const payload = amenityUpdateSchema.parse(input)

  const { error } = await supabase
    .from('amenities')
    .update({
      name: payload.name,
      description: payload.description,
      rules: payload.rules,
      is_active: payload.is_active,
    })
    .eq('id', payload.id)

  if (error) {
    console.error('Failed to update amenity', error)
    throw new Error('Unable to update amenity. Please try again.')
  }

  revalidatePath('/dashboard/amenities')
  revalidatePath('/amenities')
}

export async function setAmenityStatusAction(input: z.infer<typeof amenityStatusSchema>) {
  const supabase = getSupabaseClient()
  await ensureStaff(supabase)
  const payload = amenityStatusSchema.parse(input)

  const { error } = await supabase
    .from('amenities')
    .update({ is_active: payload.is_active })
    .eq('id', payload.id)

  if (error) {
    console.error('Failed to update amenity status', error)
    throw new Error('Unable to update amenity status.')
  }

  revalidatePath('/dashboard/amenities')
  revalidatePath('/amenities')
}

export async function updateReservationStatusAction(
  input: z.infer<typeof reservationStatusSchema>
) {
  const supabase = getSupabaseClient()
  await ensureStaff(supabase)
  const payload = reservationStatusSchema.parse(input)

  const { error } = await supabase
    .from('amenity_reservations')
    .update({ status: payload.status })
    .eq('id', payload.id)

  if (error) {
    console.error('Failed to update reservation status', error)
    throw new Error('Unable to update reservation status.')
  }

  revalidatePath('/dashboard/amenities')
  revalidatePath('/amenities')
}
