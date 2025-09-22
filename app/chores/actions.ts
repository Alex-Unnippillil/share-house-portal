'use server'

import { cookies } from 'next/headers'
import { z } from 'zod'

import { revalidateChoreScheduleForUnit } from '@/lib/chores/schedule'
import { createClient } from '@/utils/supa-server-actions'

const upsertChoreSchema = z.object({
  id: z.string().uuid().optional(),
  household_id: z.string().uuid(),
  title: z.string().min(1),
  cadence: z.string().min(1),
  points: z.coerce.number().int().min(0),
  active: z.boolean().optional(),
})

const deleteChoreSchema = z.object({
  id: z.string().uuid(),
  household_id: z.string().uuid(),
})

type ActionResult = {
  success: boolean
  error?: string
}

export async function upsertChoreDefinitionAction(input: unknown): Promise<ActionResult> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: 'Authentication required to manage chores.' }
  }

  const parsed = upsertChoreSchema.safeParse(input)
  if (!parsed.success) {
    const message = parsed.error.errors.map((issue) => issue.message).join(' ')
    return { success: false, error: message || 'Invalid chore payload provided.' }
  }

  const chore = parsed.data

  let previousHouseholdId: string | null = null
  if (chore.id) {
    const { data: existing } = await supabase
      .from('chores')
      .select('household_id')
      .eq('id', chore.id)
      .single()
    previousHouseholdId = existing?.household_id ?? null
  }

  const mutationPayload = {
    title: chore.title,
    cadence: chore.cadence,
    points: chore.points,
    active: chore.active ?? true,
    household_id: chore.household_id,
  }

  const mutation = chore.id
    ? supabase.from('chores').update(mutationPayload).eq('id', chore.id)
    : supabase.from('chores').insert(mutationPayload)

  const { error } = await mutation

  if (error) {
    console.error('Failed to upsert chore definition', error)
    return { success: false, error: 'Unable to save chore definition. Please try again.' }
  }

  const unitIds = new Set<string>()
  if (previousHouseholdId) {
    unitIds.add(previousHouseholdId)
  }
  unitIds.add(chore.household_id)

  unitIds.forEach((unitId) => revalidateChoreScheduleForUnit(unitId))

  return { success: true }
}

export async function deleteChoreDefinitionAction(input: unknown): Promise<ActionResult> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { success: false, error: 'Authentication required to manage chores.' }
  }

  const parsed = deleteChoreSchema.safeParse(input)
  if (!parsed.success) {
    const message = parsed.error.errors.map((issue) => issue.message).join(' ')
    return { success: false, error: message || 'Invalid chore reference provided.' }
  }

  const chore = parsed.data

  const { data: existing } = await supabase
    .from('chores')
    .select('household_id')
    .eq('id', chore.id)
    .single()

  const { error } = await supabase.from('chores').delete().eq('id', chore.id)

  if (error) {
    console.error('Failed to delete chore definition', error)
    return { success: false, error: 'Unable to delete chore definition. Please try again.' }
  }

  const unitId = existing?.household_id ?? chore.household_id
  revalidateChoreScheduleForUnit(unitId)

  return { success: true }
}
