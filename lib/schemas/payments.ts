import { z } from "zod"

export const manualReceiptSchema = z.object({
  invoiceId: z.string({ required_error: "Invoice number is required." }).min(1, "Invoice number is required."),
  tenantId: z.string({ required_error: "Tenant identifier is required." }).min(1, "Tenant identifier is required."),
  tenantName: z.string({ required_error: "Tenant name is required." }).min(1, "Tenant name is required."),
  amount: z
    .coerce
    .number({ invalid_type_error: "Enter the amount received." })
    .positive("Amount must be greater than zero.")
    .refine(Number.isFinite, { message: "Amount must be a valid number." }),
  referenceCode: z.string({ required_error: "Reference code is required." }).min(6, "Reference code is required."),
  receivedAt: z.coerce.date({ required_error: "Received date is required." }),
  memo: z
    .string()
    .max(500, "Notes cannot be longer than 500 characters.")
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
})

export type ManualReceiptFormValues = z.infer<typeof manualReceiptSchema>
export type ManualReceiptFormInput = z.input<typeof manualReceiptSchema>
