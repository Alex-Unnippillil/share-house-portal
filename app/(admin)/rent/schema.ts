import { z } from "zod"

export const supplyShareSchema = z.object({
  id: z.string().min(1, "Supply share id is required"),
  amount: z.number().min(0, "Amount must be zero or greater"),
  label: z.string().min(1, "Supply label is required"),
})

export const invoiceMemberSchema = z.object({
  memberId: z.string().min(1, "Member is required"),
  memberName: z.string().min(1, "Member name is required"),
  rentAmount: z
    .number({ invalid_type_error: "Enter a valid amount" })
    .min(0, "Amount cannot be negative"),
  supplyShares: z.array(supplyShareSchema).default([]),
  note: z.string().max(500, "Note is too long").optional(),
})

export const createMonthlyInvoicesSchema = z.object({
  billingMonth: z
    .string()
    .min(1, "Billing month is required")
    .regex(/\d{4}-\d{2}/, "Use YYYY-MM format"),
  dueDate: z
    .string()
    .min(1, "Due date is required")
    .regex(/\d{4}-\d{2}-\d{2}/, "Use YYYY-MM-DD format"),
  memo: z.string().max(1000, "Memo is too long").optional(),
  members: z.array(invoiceMemberSchema).min(1, "Add at least one member"),
})

export type SupplyShareSelection = z.infer<typeof supplyShareSchema>
export type InvoiceMemberInput = z.infer<typeof invoiceMemberSchema>
export type CreateMonthlyInvoicesInput = z.infer<typeof createMonthlyInvoicesSchema>
