import { Resend } from 'resend'
import { z } from 'zod'

import { PaymentReceiptEmail } from '@/components/emails/payment-receipt'
import { createCompressedJsonResponse } from '@/lib/http/compression'

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
  discountAmount: z.number().nonnegative().optional(),
  sendCopyTo: z.array(z.string().email()).optional(),
});

export async function POST(request: Request) {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    return createCompressedJsonResponse(
      request,
      { error: 'Resend API key is not configured.' },
      { status: 500 }
    )
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    return createCompressedJsonResponse(
      request,
      { error: 'Invalid JSON payload.' },
      { status: 400 }
    )
  }

  const parsed = paymentReceiptSchema.safeParse(payload)

  if (!parsed.success) {
    return createCompressedJsonResponse(
      request,
      {
        error: 'Invalid payment receipt payload.',
        details: parsed.error.flatten(),
      },
      { status: 400 }
    )
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
    discountAmount,
    sendCopyTo,
  } = parsed.data;

  const resend = new Resend(resendApiKey)

  const fromAddress = process.env.RESEND_RECEIPTS_FROM ?? 'Onyx Receipts <receipts@resend.dev>';
  const emailRecipients = [customerEmail, ...(sendCopyTo ?? [])];

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
        discountAmount,
      }),
    });

    if (error) {
      const message = error instanceof Error ? error.message : String(error)
      return createCompressedJsonResponse(
        request,
        { error: message },
        { status: 502 }
      )
    }

    return createCompressedJsonResponse(request, { id: data?.id ?? null })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return createCompressedJsonResponse(
      request,
      { error: message },
      { status: 500 }
    )
  }
}
