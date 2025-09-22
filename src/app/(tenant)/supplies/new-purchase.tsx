import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/utils/supa-server-actions'

type GenericSupabaseClient = SupabaseClient<any>

const RECEIPT_BUCKET = 'supply-receipts'

const purchaseFormSchema = z.object({
  itemId: z.string({ required_error: 'Please select an item.' }).min(1, {
    message: 'Please select an item.',
  }),
  quantity: z.coerce
    .number({
      invalid_type_error: 'Enter a quantity.',
    })
    .min(1, { message: 'Quantity must be at least 1.' }),
  unitPrice: z.coerce
    .number({
      invalid_type_error: 'Enter a price.',
    })
    .min(0.01, { message: 'Enter a price greater than zero.' }),
})

type SupplyItem = {
  id: string
  name: string
  unit?: string | null
}

type HouseholdMembership = {
  household_id: string
}

type HouseholdMember = {
  profile_id: string
}

const formatValidationError = (error: z.ZodError) => {
  const messages = Object.values(error.flatten().fieldErrors)
    .flat()
    .filter(Boolean)
  return messages[0] ?? 'Please review your submission and try again.'
}

const splitEvenly = (total: number, participantCount: number) => {
  const cents = Math.round(total * 100)
  const baseShare = Math.floor(cents / participantCount)
  const remainder = cents % participantCount

  return Array.from({ length: participantCount }, (_, index) => {
    const shareInCents = baseShare + (index < remainder ? 1 : 0)
    return shareInCents / 100
  })
}

const uploadReceipt = async (
  supabase: GenericSupabaseClient,
  file: File,
  userId: string
): Promise<string | null> => {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const fileExtension = file.name?.split('.').pop()?.toLowerCase() ?? 'pdf'
  const filePath = `${userId}/${randomUUID()}.${fileExtension}`

  const { error: uploadError } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .upload(filePath, buffer, {
      contentType: file.type || 'application/octet-stream',
    })

  if (uploadError) {
    throw new Error('Failed to upload the receipt. Please try again.')
  }

  const { data } = supabase.storage.from(RECEIPT_BUCKET).getPublicUrl(filePath)
  return data.publicUrl ?? null
}

const createPurchaseAction = async (formData: FormData) => {
  'use server'

  const cookieStore = cookies()
  const supabase = createClient(cookieStore) as GenericSupabaseClient

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth?next=/supplies/new-purchase')
  }

  const rawData = {
    itemId: formData.get('itemId'),
    quantity: formData.get('quantity'),
    unitPrice: formData.get('unitPrice'),
  }

  const parsedResult = purchaseFormSchema.safeParse(rawData)

  if (!parsedResult.success) {
    const message = formatValidationError(parsedResult.error)
    redirect(`/supplies/new-purchase?error=${encodeURIComponent(message)}`)
  }

  const receiptFile = formData.get('receipt')
  let receiptUrl: string | null = null

  try {
    if (receiptFile instanceof File && receiptFile.size > 0) {
      receiptUrl = await uploadReceipt(supabase, receiptFile, user.id)
    }
  } catch (error) {
    console.error('Receipt upload failed', error)
    redirect(
      `/supplies/new-purchase?error=${encodeURIComponent(
        'We could not upload the receipt. Please try again.'
      )}`
    )
  }

  const { itemId, quantity, unitPrice } = parsedResult.data
  const totalCost = quantity * unitPrice

  const membershipResponse = await supabase
    .from('household_members' as any)
    .select('household_id')
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  const membership = membershipResponse.data as HouseholdMembership | null
  const membershipError = membershipResponse.error

  if (membershipError || !membership?.household_id) {
    const message =
      'We could not find an active household membership for you. Please contact your property manager.'
    console.error('Missing household membership', membershipError)
    redirect(`/supplies/new-purchase?error=${encodeURIComponent(message)}`)
  }

  const householdId = membership.household_id

  const activeMembersResponse = await supabase
    .from('household_members' as any)
    .select('profile_id')
    .eq('household_id', householdId)
    .eq('status', 'active')

  const activeMembers = (activeMembersResponse.data ?? []) as HouseholdMember[]
  const activeMembersError = activeMembersResponse.error

  if (activeMembersError || activeMembers.length === 0) {
    const message =
      'We could not determine who to split this purchase with. Please check your household roster.'
    console.error('Unable to load active members', activeMembersError)
    redirect(`/supplies/new-purchase?error=${encodeURIComponent(message)}`)
  }

  const shareAmounts = splitEvenly(totalCost, activeMembers.length)

  const purchaseResponse = await supabase
    .from('supply_purchases' as any)
    .insert({
      household_id: householdId,
      item_id: itemId,
      purchased_by: user.id,
      quantity,
      unit_price: unitPrice,
      total_cost: totalCost,
      receipt_url: receiptUrl,
      purchased_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  const purchase = purchaseResponse.data as { id: string } | null
  const purchaseError = purchaseResponse.error

  if (purchaseError || !purchase?.id) {
    console.error('Failed to create supply purchase', purchaseError)
    redirect(
      `/supplies/new-purchase?error=${encodeURIComponent(
        'We were unable to save the purchase. Please try again.'
      )}`
    )
  }

  const sharePayload = activeMembers.map((member, index) => ({
    purchase_id: purchase.id,
    profile_id: member.profile_id,
    share_amount: shareAmounts[index],
    status: member.profile_id === user.id ? 'settled' : 'pending',
  }))

  const { error: shareError } = await supabase
    .from('supply_shares' as any)
    .insert(sharePayload)

  if (shareError) {
    console.error('Failed to create supply shares', shareError)
    redirect(
      `/supplies/new-purchase?error=${encodeURIComponent(
        'The purchase was saved, but we could not split the cost. Please contact support.'
      )}`
    )
  }

  revalidatePath('/supplies')
  redirect(`/supplies?success=1&total=${encodeURIComponent(totalCost.toFixed(2))}`)
}

async function getSupplyItems(supabase: GenericSupabaseClient) {
  const { data, error } = await supabase
    .from('supply_items' as any)
    .select('id, name, unit')
    .order('name', { ascending: true })

  if (error) {
    console.error('Unable to load supply items', error)
    return []
  }

  return (data ?? []) as SupplyItem[]
}

async function getActiveMemberCount(
  supabase: GenericSupabaseClient,
  householdId: string
) {
  const { data, error } = await supabase
    .from('household_members' as any)
    .select('profile_id')
    .eq('household_id', householdId)
    .eq('status', 'active')

  if (error) {
    console.error('Unable to count active members', error)
    return 0
  }

  return Array.isArray(data) ? (data as HouseholdMember[]).length : 0
}

export const metadata: Metadata = {
  title: 'Log a supply purchase',
  description:
    'Record a shared household purchase so the cost can be split evenly among roommates.',
}

const selectClasses =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

export default async function NewSupplyPurchasePage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore) as GenericSupabaseClient

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth?next=/supplies/new-purchase')
  }

  const { data: membership } = await supabase
    .from('household_members' as any)
    .select('household_id')
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  const householdId = (membership as HouseholdMembership | null)?.household_id ?? null
  const [items, activeMemberCount] = await Promise.all([
    getSupplyItems(supabase),
    householdId ? getActiveMemberCount(supabase, householdId) : Promise.resolve(0),
  ])

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Log a new purchase</h1>
        <p className="text-sm text-muted-foreground">
          Record cleaning or household essentials here so the total can be split evenly
          among your active roommates.
        </p>
      </div>

      <form
        action={createPurchaseAction}
        className="space-y-6 rounded-lg border bg-card p-6 shadow-sm"
        encType="multipart/form-data"
      >
        <div className="space-y-2">
          <label htmlFor="itemId" className="text-sm font-medium text-foreground">
            Item
          </label>
          <select
            id="itemId"
            name="itemId"
            defaultValue=""
            required
            className={selectClasses}
          >
            <option value="" disabled>
              {items.length > 0
                ? 'Select an item'
                : 'No catalogued items yet'}
            </option>
            {items.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.unit ? ` (${item.unit})` : ''}
              </option>
            ))}
          </select>
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Ask your property manager to add shared supply items so you can track them here.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="quantity" className="text-sm font-medium text-foreground">
              Quantity
            </label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              required
              placeholder="e.g. 2"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="unitPrice" className="text-sm font-medium text-foreground">
              Price per unit ($)
            </label>
            <Input
              id="unitPrice"
              name="unitPrice"
              type="number"
              inputMode="decimal"
              min={0.01}
              step={0.01}
              required
              placeholder="e.g. 4.50"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="receipt" className="text-sm font-medium text-foreground">
            Receipt
          </label>
          <Input
            id="receipt"
            name="receipt"
            type="file"
            accept="image/*,application/pdf"
          />
          <p className="text-xs text-muted-foreground">
            Uploading a photo or PDF keeps everyone in the loop on what was purchased.
          </p>
        </div>

        <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
          {activeMemberCount > 1 ? (
            <p>
              The total will be split across {activeMemberCount} active roommates once you submit.
            </p>
          ) : (
            <p>
              The full amount will be assigned to you because no other active roommates were found.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit">Save purchase</Button>
          <Button variant="ghost" asChild>
            <Link href="/supplies">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
