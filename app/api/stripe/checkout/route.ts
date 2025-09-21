import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';

import { ensureStripeCustomer } from '@/lib/payments/stripe-customer';
import { getStripeClient } from '@/lib/stripe';
import { createClient } from '@/utils/supa-server-actions';

const checkoutSchema = z.object({
  invoiceId: z.string().uuid(),
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

const toCents = (amount: number | string): number => {
  const parsed = typeof amount === 'number' ? amount : Number.parseFloat(amount);
  if (!Number.isFinite(parsed)) {
    throw new Error('Invalid invoice amount.');
  }
  return Math.round(parsed * 100);
};

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { invoiceId } = parsed.data;

  const { data: invoice, error: invoiceError } = await supabase
    .from('rent_invoices')
    .select('id, amount_due, currency, status, description, metadata, tenant_id')
    .eq('id', invoiceId)
    .eq('tenant_id', user.id)
    .single();

  if (invoiceError) {
    if (invoiceError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    return NextResponse.json({ error: invoiceError.message }, { status: 500 });
  }

  if (invoice.status?.toLowerCase() === 'paid') {
    return NextResponse.json({ error: 'Invoice is already paid' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle();

  const stripeCustomerId = await ensureStripeCustomer({
    supabase,
    tenantId: user.id,
    profile,
    fallbackEmail: user.email,
  });

  const stripe = getStripeClient();

  const lineItemName =
    invoice.description && invoice.description.trim().length > 0
      ? invoice.description
      : 'Monthly rent';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: stripeCustomerId,
    payment_method_types: ['card'],
    success_url: `${appUrl}/dashboard/payments?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/dashboard/payments`,
    metadata: {
      invoice_id: invoice.id,
      tenant_id: user.id,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: invoice.currency?.toLowerCase() ?? 'usd',
          unit_amount: toCents(invoice.amount_due),
          product_data: {
            name: lineItemName,
          },
        },
      },
    ],
  });

  const existingMetadata =
    (invoice.metadata as Record<string, unknown> | null | undefined) ?? {};

  await supabase
    .from('rent_invoices')
    .update({
      metadata: {
        ...existingMetadata,
        last_checkout_session_id: session.id,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoice.id)
    .eq('tenant_id', user.id);

  return NextResponse.json({ url: session.url });
}
