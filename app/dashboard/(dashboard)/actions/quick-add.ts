"use server"

import { randomUUID } from "crypto"

import type {
  ParsedQuickAddCommand,
  QuickAddIntent,
} from "@/lib/dashboard/quick-add-parser"

export type QuickAddPayload = Required<
  Pick<ParsedQuickAddCommand, "intent" | "dueDate" | "description">
> &
  Pick<ParsedQuickAddCommand, "amount" | "currency">

export type QuickAddResponse = {
  status: "success"
  item: {
    id: string
    type: QuickAddIntent
    description: string
    amount?: number
    currency?: string
    dueDate: string
    reference: string
  }
}

export async function createQuickAddItem(
  payload: QuickAddPayload
): Promise<QuickAddResponse> {
  validatePayload(payload)

  const id = randomUUID()
  const referencePrefix = payload.intent === "invoice" ? "inv" : "task"
  const reference = `${referencePrefix}_${id.split("-")[0]}`

  return {
    status: "success",
    item: {
      id,
      type: payload.intent,
      description: payload.description,
      amount: payload.amount,
      currency: payload.currency,
      dueDate: payload.dueDate,
      reference,
    },
  }
}

function validatePayload(payload: QuickAddPayload) {
  if (!payload.intent) {
    throw new Error("Missing the intent for this quick add command.")
  }

  if (!payload.description?.trim()) {
    throw new Error("Quick add items need a short description.")
  }

  if (!payload.dueDate) {
    throw new Error("Provide a due date so everyone stays on track.")
  }

  const dueDate = new Date(payload.dueDate)
  if (Number.isNaN(dueDate.getTime())) {
    throw new Error("Due date must be a valid ISO date string.")
  }

  if (payload.intent === "invoice") {
    if (payload.amount === undefined) {
      throw new Error("Invoices created from quick add require an amount.")
    }
    if (!payload.currency) {
      throw new Error("Invoices created from quick add require a currency.")
    }
  }
}
