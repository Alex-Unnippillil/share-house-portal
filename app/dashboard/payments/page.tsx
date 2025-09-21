import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { calculateOutstandingBalance, formatCurrency } from '@/lib/payments/calculations';
import { createClient } from '@/utils/supabase/server';

import PaymentClient from './payment-client';

export const metadata: Metadata = {
  title: 'Rent payments',
  description: 'Review rent balances, history, and manage autopay preferences.',
};

const AUTH_REDIRECT = '/auth?redirect=/dashboard/payments';

type RentInvoiceRow = {
  id: string;
  amount_due: number;
  currency: string;
  due_date: string;
  status: string;
  description: string | null;
};

type PaymentRow = {
  id: string;
  amount_paid: number;
  currency: string;
  status: string;
  paid_at: string | null;
  stripe_charge_id: string | null;
  invoice_id: string | null;
};

const normaliseCurrency = (value: string | null | undefined) =>
  (value ?? 'usd').toLowerCase();

export default async function PaymentsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(AUTH_REDIRECT);
  }

  const { data: invoicesData } = await supabase
    .from('rent_invoices')
    .select('id, amount_due, currency, due_date, status, description')
    .eq('tenant_id', user.id)
    .order('due_date', { ascending: true });

  const { data: paymentsData } = await supabase
    .from('payments')
    .select('id, amount_paid, currency, status, paid_at, stripe_charge_id, invoice_id')
    .eq('tenant_id', user.id)
    .order('paid_at', { ascending: false })
    .limit(25);

  const { data: subscriptionData } = await supabase
    .from('stripe_subscriptions')
    .select('stripe_subscription_id, status, cancel_at_period_end, current_period_end, stripe_price_id')
    .eq('tenant_id', user.id)
    .maybeSingle();

  const invoices: RentInvoiceRow[] = (invoicesData ?? []).map((invoice) => ({
    ...invoice,
    currency: normaliseCurrency(invoice.currency),
  }));

  const openInvoices = invoices.filter((invoice) =>
    ['open', 'past_due'].includes(invoice.status.toLowerCase()),
  );

  const payments: PaymentRow[] = (paymentsData ?? []).map((payment) => ({
    ...payment,
    currency: normaliseCurrency(payment.currency),
  }));

  const balance = calculateOutstandingBalance(openInvoices, payments);
  const currency =
    invoices[0]?.currency ?? payments[0]?.currency ?? 'usd';

  const upcomingInvoice = openInvoices[0] ?? null;

  return (
    <PaymentClient
      balance={balance}
      currency={currency}
      formattedBalance={formatCurrency(balance, currency)}
      invoices={invoices}
      payments={payments}
      upcomingInvoice={upcomingInvoice}
      subscription={subscriptionData ?? null}
    />
  );
}
