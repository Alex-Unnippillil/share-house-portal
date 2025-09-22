"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { z } from "zod"

import createSupabaseServer from "@/utils/supabase-server"

const settleSupplyShareSchema = z
  .object({
    shareId: z.string().uuid(),
    method: z.enum(["off_app", "rent_roll_in"]),
    note: z.string().trim().max(280).optional(),
    invoiceId: z.string().trim().max(64).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.method === "rent_roll_in") {
      if (!value.invoiceId || value.invoiceId.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invoice ID is required when rolling a share into rent.",
          path: ["invoiceId"],
        })
      }
    }
  })

export type SettleSupplyShareInput = z.infer<typeof settleSupplyShareSchema>

export async function settleSupplyShare(input: SettleSupplyShareInput) {
  const parsed = settleSupplyShareSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid settlement request.")
  }

  const { shareId, method } = parsed.data
  const note = parsed.data.note && parsed.data.note.length > 0 ? parsed.data.note : undefined
  const invoiceId =
    method === "rent_roll_in" && parsed.data.invoiceId && parsed.data.invoiceId.length > 0
      ? parsed.data.invoiceId
      : null

  const cookieStore = cookies()
  const supabase = createSupabaseServer(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    console.error("settleSupplyShare auth error", authError)
  }

  if (!user) {
    throw new Error("You must be signed in to settle supply shares.")
  }

  const { data: share, error: shareError } = await supabase
    .from("supply_shares")
    .select("id, status")
    .eq("id", shareId)
    .single()

  if (shareError || !share) {
    console.error("settleSupplyShare share lookup failed", shareError)
    throw new Error("Unable to locate the selected supply share.")
  }

  if (share.status === "settled") {
    throw new Error("This share has already been settled.")
  }

  const now = new Date().toISOString()

  const { error: updateError } = await supabase
    .from("supply_shares")
    .update({
      status: "settled",
      settled_at: now,
      settled_by: user.id,
      settlement_method: method,
      settlement_invoice_id: invoiceId,
      settlement_note: note ?? null,
    })
    .eq("id", shareId)

  if (updateError) {
    console.error("settleSupplyShare update error", updateError)
    throw new Error("We couldn't mark this share as settled. Please try again.")
  }

  revalidatePath("/supplies")

  return {
    shareId,
    status: "settled" as const,
    settlementMethod: method,
    settlementInvoiceId: invoiceId,
  }
}
