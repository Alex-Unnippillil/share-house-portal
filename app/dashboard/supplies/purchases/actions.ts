"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createSupbaseServerClient } from "@/utils/supaone"

const createPurchaseSchema = z.object({
  householdId: z.string().uuid({ message: "A household is required." }),
  itemName: z.string().min(1, { message: "Enter what was purchased." }),
  priceCad: z.number().nonnegative({ message: "Price must be zero or greater." }),
  amount: z.number().positive({ message: "Amount must be greater than zero." }),
  purchasedAt: z.string().min(1, { message: "Purchase date is required." }),
  receiptPath: z.string().nullable().optional(),
})

export type CreateSupplyPurchaseInput = z.infer<typeof createPurchaseSchema>

export async function createSupplyPurchase(input: CreateSupplyPurchaseInput) {
  const parsed = createPurchaseSchema.safeParse(input)
  if (!parsed.success) {
    return { error: "Invalid purchase details provided." }
  }

  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: "You must be signed in to record a purchase." }
  }

  const { householdId, itemName, priceCad, amount, purchasedAt, receiptPath } = parsed.data

  const { data: membership } = await supabase
    .from("household_members")
    .select("id")
    .eq("household_id", householdId)
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle()

  if (!membership) {
    return { error: "You are not a member of this household." }
  }

  const purchaseDate = new Date(purchasedAt)
  if (Number.isNaN(purchaseDate.getTime())) {
    return { error: "Purchase date is invalid." }
  }

  const normalizedPrice = Number(priceCad.toFixed(2))
  const normalizedAmount = Number(amount.toFixed(2))

  const { data, error } = await supabase
    .from("supply_purchases")
    .insert({
      household_id: householdId,
      item_name: itemName,
      price_cad: normalizedPrice,
      amount: normalizedAmount,
      purchased_at: purchaseDate.toISOString(),
      receipt_url: receiptPath && receiptPath.length > 0 ? receiptPath : null,
      buyer_id: user.id,
    })
    .select("id")
    .single()

  if (error) {
    console.error("createSupplyPurchase", error)
    return { error: "Unable to save the purchase. Please try again." }
  }

  revalidatePath("/dashboard/supplies/purchases")

  return { data }
}
