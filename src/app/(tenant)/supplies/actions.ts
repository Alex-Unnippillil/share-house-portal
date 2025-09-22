'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/utils/supabase/server'

import type { ActionResult } from './types'

const addItemSchema = z.object({
  name: z
    .string({ required_error: 'Item name is required' })
    .trim()
    .min(1, 'Item name is required'),
  quantity: z
    .string()
    .trim()
    .max(120, 'Keep the quantity under 120 characters')
    .optional()
    .transform(value => (value && value.length ? value : null)),
  category: z
    .string()
    .trim()
    .max(120, 'Keep the category under 120 characters')
    .optional()
    .transform(value => (value && value.length ? value : null)),
  notes: z
    .string()
    .trim()
    .max(500, 'Notes should be 500 characters or fewer')
    .optional()
    .transform(value => (value && value.length ? value : null)),
  neededBy: z
    .string()
    .trim()
    .optional()
    .transform(value => (value && value.length ? value : null)),
})

type AddItemInput = z.input<typeof addItemSchema>

type NormalisedAddItemInput = z.infer<typeof addItemSchema>

const markAcquiredSchema = z.object({
  itemId: z
    .string({ required_error: 'Missing supply identifier' })
    .uuid('Supply identifier is malformed'),
  itemName: z
    .string({ required_error: 'Missing item name' })
    .trim()
    .min(1, 'Missing item name'),
  quantity: z
    .string()
    .trim()
    .optional()
    .transform(value => (value && value.length ? value : null)),
  totalCost: z
    .string()
    .trim()
    .optional()
    .transform(value => (value && value.length ? Number(value.replace(/[^0-9.-]/g, '')) : null)),
  notes: z
    .string()
    .trim()
    .optional()
    .transform(value => (value && value.length ? value : null)),
})

type MarkAcquiredInput = z.input<typeof markAcquiredSchema>

type NormalisedMarkInput = z.infer<typeof markAcquiredSchema>

async function getAuthenticatedContext() {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { supabase, user: null as const, error: 'You need to be signed in to manage supplies.' }
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, unit_id, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Error loading profile for supplies', profileError)
    return { supabase, user: null as const, error: 'We could not load your profile details.' }
  }

  const profile = (profileData ?? null) as { id: string; unit_id: string | null; full_name: string | null } | null

  if (!profile?.unit_id) {
    return { supabase, user: null as const, error: 'Assign a household unit before managing supplies.' }
  }

  return { supabase, user, profile }
}

export async function addSupplyItem(rawInput: AddItemInput): Promise<ActionResult> {
  const parsed = addItemSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const input: NormalisedAddItemInput = parsed.data
  const context = await getAuthenticatedContext()

  if ('error' in context) {
    return { success: false, error: context.error }
  }

  const { supabase, user, profile } = context

  const payload = {
    name: input.name,
    quantity: input.quantity,
    category: input.category,
    notes: input.notes,
    needed_by: input.neededBy,
    status: 'needed',
    unit_id: profile.unit_id,
    created_by: user.id,
  }

  const { error } = await supabase.from('household_supply_items').insert(payload)

  if (error) {
    console.error('Failed to add supply item', error)
    return { success: false, error: 'Could not add the supply item. Please try again.' }
  }

  revalidatePath('/supplies')

  return { success: true, message: 'Item added to the shopping list.' }
}

export async function markSupplyItemAcquired(rawInput: MarkAcquiredInput): Promise<ActionResult> {
  const parsed = markAcquiredSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const input: NormalisedMarkInput = parsed.data
  const context = await getAuthenticatedContext()

  if ('error' in context) {
    return { success: false, error: context.error }
  }

  const { supabase, user, profile } = context

  const timestamp = new Date().toISOString()

  const { error: updateError } = await supabase
    .from('household_supply_items')
    .update({
      status: 'acquired',
      last_purchased_at: timestamp,
      updated_at: timestamp,
    })
    .eq('id', input.itemId)
    .eq('unit_id', profile.unit_id)

  if (updateError) {
    console.error('Failed to mark supply item as acquired', updateError)
    return { success: false, error: 'We were unable to mark this item as acquired.' }
  }

  const purchasePayload: Record<string, unknown> = {
    item_id: input.itemId,
    unit_id: profile.unit_id,
    item_name: input.itemName,
    purchased_at: timestamp,
    purchased_by: user.id,
  }

  if (input.quantity) {
    purchasePayload.quantity = input.quantity
  }
  if (typeof input.totalCost === 'number' && !Number.isNaN(input.totalCost)) {
    purchasePayload.total_cost = input.totalCost
  }
  if (input.notes) {
    purchasePayload.notes = input.notes
  }

  const { error: purchaseError } = await supabase.from('household_supply_purchases').insert(purchasePayload)

  if (purchaseError) {
    console.error('Failed to log supply purchase', purchaseError)
  }

  revalidatePath('/supplies')

  return {
    success: true,
    message: purchaseError ? 'Item marked as acquired, but logging the purchase failed.' : 'Marked item as acquired.',
  }
}
