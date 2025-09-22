import { PaymentReceiptEmail } from '@/components/emails/payment-receipt';
import type { Json } from '@/lib/supabase';
import { getServiceRoleClient, insertEvent } from '@/queries/events';
import { Resend } from 'resend';
import { z } from 'zod';

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
  householdId: z.string().uuid(),
  memberId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return Response.json(
      { error: "Resend API key is not configured." },
      { status: 500 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return Response.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const parsed = paymentReceiptSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid payment receipt payload.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
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
    householdId,
    memberId,
  } = parsed.data;

  const resend = new Resend(resendApiKey);

  const fromAddress = process.env.RESEND_RECEIPTS_FROM ?? 'Onyx Receipts <receipts@resend.dev>';
  const emailRecipients = [customerEmail, ...(sendCopyTo ?? [])];

  try {
    const paymentDateToUse = paymentDate ?? new Date();
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: emailRecipients,
      subject: `Receipt for payment ${paymentId}`,
      react: PaymentReceiptEmail({
        customerName,
        paymentId,
        amountPaid,
        currency,
        paymentDate: paymentDateToUse,
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
      const message = error instanceof Error ? error.message : String(error);
      return Response.json({ error: message }, { status: 502 });
    }

    const client = getServiceRoleClient();
    const payload = {
      amountPaid,
      currency,
      paymentDate: paymentDateToUse.toISOString(),
      items: (items ?? []) as unknown as Json,
      businessName,
      supportEmail,
      billingAddress,
      notes,
      subtotalAmount,
      taxAmount,
      discountAmount,
      recipients: emailRecipients as unknown as Json,
    } satisfies Json;

    await insertEvent(client, {
      household_id: householdId,
      member_id: memberId ?? null,
      action: 'payment.receipt_sent',
      entity_type: 'payment',
      entity_id: paymentId,
      payload,
    });

    return Response.json({ id: data?.id ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
