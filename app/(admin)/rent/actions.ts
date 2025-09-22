"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/utils/supabase/server"

import {
  type CreateMonthlyInvoicesInput,
  createMonthlyInvoicesSchema,
} from "./schema"

export type CreateMonthlyInvoicesResult =
  | { status: "success"; message: string; insertedCount: number }
  | { status: "error"; message: string }

export async function createMonthlyInvoices(
  input: CreateMonthlyInvoicesInput,
): Promise<CreateMonthlyInvoicesResult> {
  const parsed = createMonthlyInvoicesSchema.safeParse(input)

  if (!parsed.success) {
    const issue = parsed.error.issues.at(0)
    return {
      status: "error",
      message: issue?.message ?? "Invalid invoice details supplied.",
    }
  }

  const payload = parsed.data

  if (payload.members.length === 0) {
    return { status: "error", message: "Add at least one roommate to create invoices." }
  }

  const supabase = createClient()

  const invoiceRows = payload.members.map((member) => {
    const supplyTotal = member.supplyShares.reduce((sum, share) => sum + share.amount, 0)
    const totalAmount = member.rentAmount + supplyTotal

    return {
      member_id: member.memberId,
      billing_month: payload.billingMonth,
      due_date: payload.dueDate,
      rent_amount: member.rentAmount,
      supply_total: supplyTotal,
      total_amount: totalAmount,
      status: "draft",
      memo: member.note ?? payload.memo ?? null,
      metadata: {
        adminMemo: payload.memo ?? null,
        memberNote: member.note ?? null,
        supplyShareIds: member.supplyShares.map((share) => share.id),
      },
    }
  })

  try {
    const { data: insertedInvoices, error: insertError } = await supabase
      .from("rent_invoices")
      .insert(invoiceRows)
      .select("id")

    if (insertError || !insertedInvoices) {
      throw insertError ?? new Error("Failed to insert invoices")
    }

    const supplyLinks: { invoice_id: string; supply_share_id: string; amount: number }[] = []
    const supplyShareIds = new Set<string>()

    insertedInvoices.forEach((invoice, index) => {
      const member = payload.members[index]
      if (!member) return

      member.supplyShares.forEach((share) => {
        supplyLinks.push({
          invoice_id: invoice.id,
          supply_share_id: share.id,
          amount: share.amount,
        })
        supplyShareIds.add(share.id)
      })
    })

    if (supplyLinks.length > 0) {
      const { error: linkError } = await supabase
        .from("rent_invoice_supply_shares")
        .insert(supplyLinks)

      if (linkError) {
        await supabase.from("rent_invoices").delete().in(
          "id",
          insertedInvoices.map((invoice) => invoice.id),
        )
        throw linkError
      }

      const shareIdList = Array.from(supplyShareIds)
      if (shareIdList.length > 0) {
        const { error: updateError } = await supabase
          .from("supply_shares")
          .update({ status: "invoiced" })
          .in("id", shareIdList)

        if (updateError) {
          console.error("Failed to update supply share status", updateError)
        }
      }
    }

    await revalidatePath("/rent")

    return {
      status: "success",
      message: "Draft invoices created successfully.",
      insertedCount: insertedInvoices.length,
    }
  } catch (error) {
    console.error("createMonthlyInvoices", error)
    return {
      status: "error",
      message: "We couldn't save the invoices. Please try again in a moment.",
    }
  }
}
