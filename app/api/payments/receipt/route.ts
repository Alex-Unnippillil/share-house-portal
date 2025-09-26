import { PaymentReceiptEmail } from "@/components/emails/payment-receipt"
import { jsonError, jsonErrorFromUnknown } from "@/lib/errors"
import { Resend } from "resend"
import { z } from "zod"

const lineItemSchema = z.object({
  description: z.string().min(1, "Line item description is required."),
  quantity: z.number().positive().optional(),
  unitAmount: z.number().nonnegative().optional(),
  totalAmount: z.number().nonnegative().optional(),
});

const paymentReceiptSchema = z.object({
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
  taxRate: z.number().nonnegative().optional(),
  taxDetails: z
    .array(
      z.object({
        label: z.string().min(1),
        amount: z.number(),
        rate: z.number().optional(),
        jurisdiction: z.string().optional(),
      }),
    )
    .or(z.record(z.any()))
    .optional(),
  discountAmount: z.number().nonnegative().optional(),
  sendCopyTo: z.array(z.string().email()).optional(),
});

export async function POST(request: Request) {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    return jsonError("CONFIGURATION_ERROR", {
      message: "Resend API key is not configured.",
    })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    return jsonError("REQUEST_VALIDATION_ERROR", {
      message: "Invalid JSON payload.",
    })
  }

  const parsed = paymentReceiptSchema.safeParse(payload)

  if (!parsed.success) {
    return jsonError("REQUEST_VALIDATION_ERROR", {
      message: "Invalid payment receipt payload.",
      details: parsed.error.flatten(),
    })
  }

  const {
    customerEmail,
    customerName,
    paymentId,
    amountPaid,
    currency,
    paymentDate,
    items,
    businessName,
    supportEmail,
    billingAddress,
    notes,
    subtotalAmount,
    taxAmount,
    taxRate,
    taxDetails,
    discountAmount,
    sendCopyTo,
  } = parsed.data;

  const resend = new Resend(resendApiKey)

  const fromAddress =
    process.env.RESEND_RECEIPTS_FROM ??
    "Roomsily Receipts <receipts@resend.dev>"
  const emailRecipients = [customerEmail, ...(sendCopyTo ?? [])]

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: emailRecipients,
      subject: `Receipt for payment ${paymentId}`,
      react: PaymentReceiptEmail({
        customerName,
        paymentId,
        amountPaid,
        currency,
        paymentDate: paymentDate ?? new Date(),
        items,
        businessName,
        supportEmail,
        billingAddress,
        notes,
        subtotalAmount,
        taxAmount,
        taxRate,
        taxDetails,
        discountAmount,
      }),
    });

    if (error) {
      const message = error instanceof Error ? error.message : String(error)
      return jsonError("UPSTREAM_SERVICE_ERROR", {
        message,
        details: { provider: "resend" },
      })
    }

    return Response.json({ id: data?.id ?? null })
  } catch (error) {
    return jsonErrorFromUnknown(error, "UPSTREAM_SERVICE_ERROR")
  }
}
