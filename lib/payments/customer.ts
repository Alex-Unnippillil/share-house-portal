import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import type { Database } from "@/lib/supabase";

interface EnsureStripeCustomerArgs {
  supabase: SupabaseClient<Database>;
  stripe: Stripe;
  tenantId: string;
  email?: string | null;
  name?: string | null;
}

export async function ensureStripeCustomer({
  supabase,
  stripe,
  tenantId,
  email,
  name,
}: EnsureStripeCustomerArgs): Promise<{
  customerId: string;
}> {
  const existing = await supabase
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (existing.error) {
    throw new Error(existing.error.message);
  }

  if (existing.data?.stripe_customer_id) {
    return { customerId: existing.data.stripe_customer_id };
  }

  const customer = await stripe.customers.create({
    email: email ?? undefined,
    name: name ?? undefined,
    metadata: { tenant_id: tenantId },
  });

  const { error } = await supabase.from("stripe_customers").upsert({
    tenant_id: tenantId,
    stripe_customer_id: customer.id,
    billing_email: customer.email,
    default_payment_method_id: customer.invoice_settings?.default_payment_method?.toString() ?? null,
    livemode: customer.livemode ?? false,
    metadata: customer.metadata as Record<string, unknown>,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { customerId: customer.id };
}
