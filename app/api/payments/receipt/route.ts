import type Stripe from 'stripe';

import { PaymentReceiptEmail } from '@/components/emails/payment-receipt';
import { buildReceiptPayload } from '@/lib/payments/stripe-format';
import { getStripeClient } from '@/lib/stripe';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const receiptRequestSchema = z.object({
  chargeId: z.string().min(1, 'Stripe charge ID is required'),
  sendCopyTo: z.array(z.string().email()).optional(),
});

const formatBillingAddress = (charge: Stripe.Charge): string | undefined => {
  const address = charge.billing_details?.address;
  if (!address) return undefined;

  const parts = [
    address.line1,
    address.line2,
    [address.city, address.state, address.postal_code].filter(Boolean).join(', '),
    address.country,
  ].filter((part) => part && part.length > 0) as string[];

  if (!parts.length) return undefined;
  return parts.join('\n');
};

let resendClient: Resend | null = null;

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('Resend API key is not configured.');
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
};

const getStripeInvoice = async (charge: Stripe.Charge) => {
  const stripe = getStripeClient();
  if (charge.invoice && typeof charge.invoice !== 'string') {
    return charge.invoice;
  }
  if (typeof charge.invoice === 'string') {
    return await stripe.invoices.retrieve(charge.invoice, {
      expand: ['lines.data.price.product'],
    });
  }
  return null;
};

const expandCharge = async (chargeId: string) => {
  const stripe = getStripeClient();
  const charge = await stripe.charges.retrieve(chargeId, {
    expand: ['invoice.lines.data.price.product', 'customer'],
  });
  return charge;
};

export const sendReceiptEmail = async ({
  chargeId,
  additionalRecipients = [],
}: {
  chargeId: string;
  additionalRecipients?: string[];
}) => {
  const charge = await expandCharge(chargeId);
  if (!charge.paid) {
    throw new Error('Charge is not marked as paid.');
  }

  const invoice = await getStripeInvoice(charge);
  const receiptPayload = buildReceiptPayload({ charge, invoice });

  const billingAddress = formatBillingAddress(charge);
  const fromAddress =
    process.env.RESEND_RECEIPTS_FROM ?? 'Onyx Receipts <receipts@resend.dev>';

  const resend = getResendClient();

  const { customerEmail, ...emailProps } = receiptPayload;
  const toRecipients = [customerEmail, ...additionalRecipients];

  const { error } = await resend.emails.send({
    from: fromAddress,
    to: toRecipients,
    subject: `Receipt for payment ${emailProps.paymentId}`,
    react: PaymentReceiptEmail({
      ...emailProps,
      billingAddress,
      supportEmail: process.env.RECEIPTS_SUPPORT_EMAIL ?? undefined,
    }),
  });

  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(message);
  }

  return {
    paymentId: emailProps.paymentId,
    recipients: toRecipients,
  };
};

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const parsed = receiptRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const result = await sendReceiptEmail({
      chargeId: parsed.data.chargeId,
      additionalRecipients: parsed.data.sendCopyTo ?? [],
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
