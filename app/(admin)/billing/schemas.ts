import { z } from "zod"

export const invoiceAdjustmentSchema = z.object({
  invoiceId: z.string({ required_error: "Invoice is required." }).uuid("Invoice must be a valid UUID."),
  amount: z
    .coerce.number({ invalid_type_error: "Amount is required." })
    .positive("Amount must be greater than zero."),
  reason: z
    .string({ required_error: "Reason is required." })
    .min(3, "Reason must be at least 3 characters."),
  memo: z
    .string()
    .max(280, "Memo must be 280 characters or fewer.")
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  type: z.enum(["credit", "reversal"], {
    required_error: "Adjustment type is required.",
  }),
})

export type InvoiceAdjustmentInput = z.infer<typeof invoiceAdjustmentSchema>
