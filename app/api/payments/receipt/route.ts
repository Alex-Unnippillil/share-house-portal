import {
  paymentReceiptEmailDataSchema,
  renderPaymentReceiptEmail,
} from "@/emails/payment-receipt"
import { jsonError, jsonErrorFromUnknown } from "@/lib/errors"
import { Resend } from "resend"
import { z } from "zod"

const paymentReceiptSchema = paymentReceiptEmailDataSchema.extend({
  customerEmail: z.string().email(),
  paymentDate: paymentReceiptEmailDataSchema.shape.paymentDate.optional(),
  sendCopyTo: z.array(z.string().email()).optional(),
})

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

  const { customerEmail, sendCopyTo, paymentDate, ...emailData } = parsed.data;

  const resend = new Resend(resendApiKey)

  const fromAddress =
    process.env.RESEND_RECEIPTS_FROM ??
    "Roomsily Receipts <receipts@resend.dev>"
  const emailRecipients = [customerEmail, ...(sendCopyTo ?? [])]

  try {
    const html = await renderPaymentReceiptEmail({
      ...emailData,
      paymentDate: paymentDate ?? new Date(),
    });

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: emailRecipients,
      subject: `Receipt for payment ${emailData.paymentId}`,
      html,
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
