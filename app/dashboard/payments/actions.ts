'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { z } from 'zod';

import { ensureStripeCustomer } from '@/lib/payments/stripe-customer';
import { getStripeClient, getStripeRecurringPriceId } from '@/lib/stripe';
import { createClient } from '@/utils/supa-server-actions';

const toggleSchema = z.object({
  enable: z.boolean(),
  priceId: z.string().optional(),
});

type ToggleInput = z.infer<typeof toggleSchema>;

const toIsoDate = (timestamp?: number | null) =>
  typeof timestamp === 'number' ? new Date(timestamp * 1000).toISOString() : null;

export async function toggleAutopay(input: ToggleInput) {
  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error('Invalid autopay request payload');
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('You must be signed in to manage autopay');
  }

  const { enable, priceId: providedPriceId } = parsed.data;

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

  const { data: existingSubscription } = await supabase
    .from('stripe_subscriptions')
    .select('stripe_subscription_id, metadata')
    .eq('tenant_id', user.id)
    .maybeSingle();

  if (enable) {
    const priceId = providedPriceId ?? getStripeRecurringPriceId();
    if (!priceId) {
      throw new Error('Recurring price configuration is missing.');
    }

    const subscription = existingSubscription?.stripe_subscription_id
      ? await stripe.subscriptions.update(existingSubscription.stripe_subscription_id, {
          cancel_at_period_end: false,
          metadata: {
            tenant_id: user.id,
          },
        })
      : await stripe.subscriptions.create({
          customer: stripeCustomerId,
          items: [{ price: priceId }],
          metadata: {
            tenant_id: user.id,
          },
        });

    const { error: upsertError } = await supabase.from('stripe_subscriptions').upsert(
      {
        tenant_id: user.id,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        stripe_price_id: priceId,
        cancel_at_period_end: subscription.cancel_at_period_end ?? false,
        current_period_end: toIsoDate(subscription.current_period_end),
        metadata: subscription.metadata ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id' },
    );

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    revalidatePath('/dashboard/payments');
    return {
      success: true,
      status: subscription.status,
      subscriptionId: subscription.id,
      currentPeriodEnd: toIsoDate(subscription.current_period_end),
    } as const;
  }

  if (existingSubscription?.stripe_subscription_id) {
    await stripe.subscriptions.cancel(existingSubscription.stripe_subscription_id);

    const { error: upsertError } = await supabase.from('stripe_subscriptions').upsert(
      {
        tenant_id: user.id,
        stripe_subscription_id: existingSubscription.stripe_subscription_id,
        status: 'canceled',
        cancel_at_period_end: false,
        current_period_end: null,
        metadata: existingSubscription.metadata ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id' },
    );

    if (upsertError) {
      throw new Error(upsertError.message);
    }
  }

  revalidatePath('/dashboard/payments');
  return {
    success: true,
    status: 'canceled',
    currentPeriodEnd: null,
  } as const;
}
