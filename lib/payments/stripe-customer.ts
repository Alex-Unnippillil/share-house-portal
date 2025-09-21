import type { SupabaseClient } from '@supabase/supabase-js';

import { getStripeClient } from '@/lib/stripe';
import type { Database } from '@/lib/supabase';

type ProfilesRow = Database['public']['Tables']['profiles']['Row'];
type StripeCustomersRow = Database['public']['Tables']['stripe_customers']['Row'];

type EnsureCustomerArgs = {
  supabase: SupabaseClient<Database>;
  tenantId: string;
  profile?: Pick<ProfilesRow, 'full_name' | 'email'> | null;
  fallbackEmail?: string | null;
};

export const ensureStripeCustomer = async ({
  supabase,
  tenantId,
  profile,
  fallbackEmail,
}: EnsureCustomerArgs): Promise<string> => {
  const { data: existing } = await supabase
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id;
  }

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: profile?.email ?? fallbackEmail ?? undefined,
    name: profile?.full_name ?? undefined,
    metadata: {
      supabase_tenant_id: tenantId,
    },
  });

  const defaultPaymentMethod =
    typeof customer.invoice_settings?.default_payment_method === 'string'
      ? customer.invoice_settings?.default_payment_method
      : customer.invoice_settings?.default_payment_method?.id ?? null;

  const payload: Partial<StripeCustomersRow> & {
    tenant_id: string;
    stripe_customer_id: string;
  } = {
    tenant_id: tenantId,
    stripe_customer_id: customer.id,
    default_payment_method: defaultPaymentMethod,
  };

  const { error } = await supabase
    .from('stripe_customers')
    .upsert(payload, { onConflict: 'tenant_id' });

  if (error) {
    throw error;
  }

  return customer.id;
};
