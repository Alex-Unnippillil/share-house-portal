import { PaymentReceiptEmail } from "@/components/emails/payment-receipt"
import { Resend } from "resend"
import { z } from "zod"

export const lineItemSchema = z.object({
  description: z.string().min(1, "Line item description is required."),
  quantity: z.number().positive().optional(),
  unitAmount: z.number().nonnegative().optional(),
  totalAmount: z.number().nonnegative().optional(),
})

export const paymentReceiptSchema = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
  paymentId: z.string().min(1),
  amountPaid: z.number().positive(),
  currency: z.string().min(3).max(10),
  paymentDate: z.coerce.date().optional(),
  items: z.array(lineItemSchema).optional(),
  businessName: z.string().optional(),
  supportEmail: z.string().email().optional(),
  billingAddress: z.string().optional(),
  notes: z.string().optional(),
  subtotalAmount: z.number().nonnegative().optional(),
  taxAmount: z.number().nonnegative().optional(),
  discountAmount: z.number().nonnegative().optional(),
  sendCopyTo: z.array(z.string().email()).optional(),
})

export type PaymentReceiptPayload = z.infer<typeof paymentReceiptSchema>

export async function sendPaymentReceiptEmail(payload: PaymentReceiptPayload) {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    throw new Error("Resend API key is not configured.")
  }

  const resend = new Resend(resendApiKey)
  const fromAddress =
    process.env.RESEND_RECEIPTS_FROM ?? "Roomsily Receipts <receipts@resend.dev>"
  const emailRecipients = [
    payload.customerEmail,
    ...(payload.sendCopyTo ?? []),
  ]

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: emailRecipients,
    subject: `Receipt for payment ${payload.paymentId}`,
    react: PaymentReceiptEmail({
      customerName: payload.customerName,
      paymentId: payload.paymentId,
      amountPaid: payload.amountPaid,
      currency: payload.currency,
      paymentDate: payload.paymentDate ?? new Date(),
      items: payload.items,
      businessName: payload.businessName,
      supportEmail: payload.supportEmail,
      billingAddress: payload.billingAddress,
      notes: payload.notes,
      subtotalAmount: payload.subtotalAmount,
      taxAmount: payload.taxAmount,
      discountAmount: payload.discountAmount,
    }),
  })

  if (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(message)
  }

  return data
}
