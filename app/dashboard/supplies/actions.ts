"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createActionClient } from "@/utils/supabase/actions"

const purchaseInputSchema = z.object({
  supply_item_id: z.string().min(1, "Supply item is required"),
  quantity: z
    .number({ invalid_type_error: "Quantity must be a number" })
    .int()
    .positive()
    .optional(),
  purchased_at: z.coerce.date().optional(),
})

const reopenInputSchema = z.object({
  id: z.string().min(1, "Item id is required"),
})

export async function recordPurchaseAction(input: z.infer<typeof purchaseInputSchema>) {
  const payload = purchaseInputSchema.parse(input)
  const supabase = await createActionClient()

  const { error } = await supabase.from("purchases").insert({
    supply_item_id: payload.supply_item_id,
    quantity: payload.quantity ?? null,
    purchased_at: (payload.purchased_at ?? new Date()).toISOString(),
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/dashboard/supplies")
}

export async function reopenToBuyItemAction(input: z.infer<typeof reopenInputSchema>) {
  const payload = reopenInputSchema.parse(input)
  const supabase = await createActionClient()

  const { error } = await supabase
    .from("to_buy_items")
    .update({ fulfilled_at: null })
    .eq("id", payload.id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/dashboard/supplies")
}
