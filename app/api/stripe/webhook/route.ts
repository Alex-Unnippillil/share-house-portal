import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';

import { SUPPORTED_STRIPE_EVENTS, getStripeClient, getStripeWebhookSecret } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase-service';
import type { Database } from '@/lib/supabase';
import { sendReceiptEmail } from '@/app/api/payments/receipt/route';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stripe = getStripeClient();

const toCurrencyAmount = (amount?: number | null) =>
  amount != null ? Math.round(amount) / 100 : 0;

const toIsoDate = (timestamp?: number | null) =>
  typeof timestamp === 'number' ? new Date(timestamp * 1000).toISOString() : null;

const resolveTenantIdFromCustomer = async (
  supabase: SupabaseClient<Database>,
  customerId: string | null,
): Promise<string | null> => {
  if (!customerId) return null;
  const { data } = await supabase
    .from('stripe_customers')
    .select('tenant_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  return data?.tenant_id ?? null;
};

const upsertPaymentFromCharge = async (
  supabase: SupabaseClient<Database>,
  params: {
    charge: Stripe.Charge;
    tenantId: string | null;
    invoiceId?: string | null;
    paymentIntentId?: string | null;
  },
): Promise<boolean> => {
  const { charge, tenantId, invoiceId, paymentIntentId } = params;
  if (!tenantId) {
    return false;
  }

  const { data: existing } = await supabase
    .from('payments')
    .select('id')
    .eq('stripe_charge_id', charge.id)
    .maybeSingle();

  const paidAt = charge.created
    ? new Date(charge.created * 1000).toISOString()
    : new Date().toISOString();

  const payload = {
    tenant_id: tenantId,
    invoice_id: invoiceId ?? null,
    stripe_payment_intent_id: paymentIntentId ?? null,
    stripe_charge_id: charge.id,
    amount_paid: toCurrencyAmount(charge.amount_captured ?? charge.amount),
    currency: (charge.currency ?? 'usd').toLowerCase(),
    status: charge.status ?? 'succeeded',
    paid_at: paidAt,
    metadata: charge.metadata ?? {},
    updated_at: new Date().toISOString(),
  } satisfies Database['public']['Tables']['payments']['Insert'];

  if (existing?.id) {
    await supabase
      .from('payments')
      .update(payload)
      .eq('id', existing.id);
    return false;
  }

  await supabase.from('payments').insert(payload);
  return true;
};

const updateInvoiceStatus = async (
  supabase: SupabaseClient<Database>,
  invoiceId: string,
  updates: Partial<Database['public']['Tables']['rent_invoices']['Update']>,
) => {
  const { data: existing } = await supabase
    .from('rent_invoices')
    .select('metadata')
    .eq('id', invoiceId)
    .maybeSingle();

  const metadataUpdate = updates.metadata
    ? {
        metadata: {
          ...((existing?.metadata as Record<string, unknown>) ?? {}),
          ...(updates.metadata as Record<string, unknown>),
        },
      }
    : {};

  await supabase
    .from('rent_invoices')
    .update({
      ...updates,
      ...metadataUpdate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoiceId);
};

const handleCheckoutSession = async (
  supabase: SupabaseClient<Database>,
  session: Stripe.Checkout.Session,
) => {
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const invoiceId = session.metadata?.invoice_id ?? null;
  let tenantId = session.metadata?.tenant_id ?? null;

  if (!tenantId && session.customer && typeof session.customer === 'string') {
    tenantId = await resolveTenantIdFromCustomer(supabase, session.customer);
  }

  if (invoiceId && !tenantId) {
    const { data: invoiceRow } = await supabase
      .from('rent_invoices')
      .select('tenant_id')
      .eq('id', invoiceId)
      .maybeSingle();
    tenantId = invoiceRow?.tenant_id ?? tenantId;
  }

  if (!paymentIntentId) {
    return;
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ['latest_charge'],
  });

  const charge =
    (paymentIntent.latest_charge &&
    typeof paymentIntent.latest_charge !== 'string'
      ? paymentIntent.latest_charge
      : paymentIntent.charges?.data?.[0]) ?? null;

  if (!charge) {
    return;
  }

  const invoice =
    charge.invoice && typeof charge.invoice === 'string'
      ? charge.invoice
      : charge.invoice?.id ?? null;

  const inserted = await upsertPaymentFromCharge(supabase, {
    charge,
    tenantId,
    invoiceId,
    paymentIntentId,
  });

  if (invoiceId) {
    await updateInvoiceStatus(supabase, invoiceId, {
      status: 'paid',
      stripe_invoice_id: invoice ?? undefined,
      metadata: {
        last_charge_id: charge.id,
        checkout_session_id: session.id,
      },
    });
  }

  if (inserted) {
    await sendReceiptEmail({ chargeId: charge.id });
  }
};

const handleInvoicePayment = async (
  supabase: SupabaseClient<Database>,
  invoice: Stripe.Invoice,
) => {
  const invoiceId =
    (invoice.metadata?.invoice_id as string | undefined) ?? null;
  const chargeId =
    typeof invoice.charge === 'string'
      ? invoice.charge
      : invoice.charge?.id ?? null;

  const tenantId = await resolveTenantIdFromCustomer(
    supabase,
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null,
  );

  if (invoiceId) {
    await updateInvoiceStatus(supabase, invoiceId, {
      status: 'paid',
      stripe_invoice_id: invoice.id,
      metadata: invoice.metadata ?? {},
    });
  }

  if (chargeId) {
    const charge = await stripe.charges.retrieve(chargeId, {
      expand: ['customer', 'invoice.lines.data.price.product'],
    });

    const inserted = await upsertPaymentFromCharge(supabase, {
      charge,
      tenantId,
      invoiceId: invoiceId ?? (invoice.id ?? null),
      paymentIntentId:
        typeof invoice.payment_intent === 'string'
          ? invoice.payment_intent
          : invoice.payment_intent?.id ?? null,
    });

    if (inserted) {
      await sendReceiptEmail({ chargeId: charge.id });
    }
  }
};

const handleSubscriptionEvent = async (
  supabase: SupabaseClient<Database>,
  subscription: Stripe.Subscription,
) => {
  const tenantId =
    (subscription.metadata?.tenant_id as string | undefined) ??
    (await resolveTenantIdFromCustomer(
      supabase,
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id ?? null,
    ));

  if (!tenantId) {
    return;
  }

  await supabase.from('stripe_subscriptions').upsert(
    {
      tenant_id: tenantId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      stripe_price_id: subscription.items?.data?.[0]?.price?.id ?? null,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      current_period_end: toIsoDate(subscription.current_period_end),
      metadata: subscription.metadata ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id' },
  );
};

const handleChargeSucceeded = async (
  supabase: SupabaseClient<Database>,
  charge: Stripe.Charge,
) => {
  const tenantId = await resolveTenantIdFromCustomer(
    supabase,
    typeof charge.customer === 'string' ? charge.customer : charge.customer?.id ?? null,
  );

  const inserted = await upsertPaymentFromCharge(supabase, {
    charge,
    tenantId,
    invoiceId:
      typeof charge.invoice === 'string'
        ? charge.invoice
        : charge.invoice?.id ?? null,
    paymentIntentId:
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id ?? null,
  });

  if (inserted) {
    await sendReceiptEmail({ chargeId: charge.id });
  }
};

const processEvent = async (
  supabase: SupabaseClient<Database>,
  event: Stripe.Event,
) => {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSession(supabase, event.data.object as Stripe.Checkout.Session);
      break;
    case 'invoice.payment_succeeded':
      await handleInvoicePayment(supabase, event.data.object as Stripe.Invoice);
      break;
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await handleSubscriptionEvent(
        supabase,
        event.data.object as Stripe.Subscription,
      );
      break;
    case 'charge.succeeded':
      await handleChargeSucceeded(supabase, event.data.object as Stripe.Charge);
      break;
    default:
      break;
  }
};

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe signature header.' }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, getStripeWebhookSecret());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!SUPPORTED_STRIPE_EVENTS.includes(event.type as typeof SUPPORTED_STRIPE_EVENTS[number])) {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const supabase = createServiceRoleClient();

  try {
    await processEvent(supabase, event);
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
