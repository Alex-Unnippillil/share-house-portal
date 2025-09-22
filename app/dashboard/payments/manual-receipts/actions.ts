"use server"

import { revalidatePath } from "next/cache"

import type { Database } from "@/lib/supabase"
import { manualReceiptSchema } from "@/lib/schemas/payments"
import { createSupbaseServerClient } from "@/utils/supaone"

export type ManualReceiptActionResult =
  | {
      success: true
      data: Database["public"]["Tables"]["payments"]["Row"]
    }
  | {
      success: false
      error: string
      fieldErrors?: Record<string, string[]>
    }

export async function recordManualEtransferReceipt(
  values: unknown,
): Promise<ManualReceiptActionResult> {
  const parsed = manualReceiptSchema.safeParse(values)

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    const supabase = await createSupbaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const payload = {
      invoice_id: parsed.data.invoiceId,
      tenant_id: parsed.data.tenantId,
      tenant_name: parsed.data.tenantName,
      amount: parsed.data.amount,
      currency: "CAD",
      method: "etransfer",
      reference_code: parsed.data.referenceCode,
      notes: parsed.data.memo ?? null,
      status: "completed",
      recorded_by: user?.id ?? null,
      received_at: parsed.data.receivedAt.toISOString(),
    }

    const { data, error } = await supabase
      .from("payments")
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error("Failed to record manual e-Transfer receipt", error)
      return {
        success: false,
        error: "We could not save the receipt. Try again or confirm the payment hasn’t already been recorded.",
      }
    }

    revalidatePath("/dashboard/payments/manual-receipts")

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error("Unexpected error while inserting manual receipt", error)
    return {
      success: false,
      error: "Unexpected error while saving the receipt. Please try again.",
    }
  }
}
