'use client';

import { useMemo, useState, useTransition } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { formatCurrency } from '@/lib/payments/calculations';

import { toggleAutopay } from './actions';

type RentInvoice = {
  id: string;
  amount_due: number;
  currency: string;
  due_date: string;
  status: string;
  description: string | null;
};

type Payment = {
  id: string;
  amount_paid: number;
  currency: string;
  status: string;
  paid_at: string | null;
  stripe_charge_id: string | null;
  invoice_id: string | null;
};

type Subscription = {
  stripe_subscription_id: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  stripe_price_id: string | null;
} | null;

type PaymentClientProps = {
  balance: number;
  currency: string;
  formattedBalance: string;
  upcomingInvoice: RentInvoice | null;
  invoices: RentInvoice[];
  payments: Payment[];
  subscription: Subscription;
};

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
    }).format(new Date(iso));
  } catch (error) {
    return iso;
  }
};

const statusBadgeVariant = (status: string) => {
  const normalised = status.toLowerCase();
  if (['paid', 'succeeded', 'active'].includes(normalised)) return 'complete' as const;
  if (['past_due', 'requires_payment_method', 'unpaid'].includes(normalised))
    return 'destructive' as const;
  return 'outline' as const;
};

const nextAutopayDate = (subscription: Subscription) => {
  if (!subscription?.current_period_end) return null;
  try {
    return new Date(subscription.current_period_end);
  } catch (error) {
    return null;
  }
};

export default function PaymentClient(props: PaymentClientProps) {
  const { balance, currency, formattedBalance, upcomingInvoice, invoices, payments, subscription } = props;

  const [isPaying, startPayTransition] = useTransition();
  const [autopayPending, startAutopayTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [autopayStatus, setAutopayStatus] = useState(subscription?.status ?? 'inactive');
  const [autopayEnabled, setAutopayEnabled] = useState(subscription?.status === 'active');
  const [autopayNextDate, setAutopayNextDate] = useState<Date | null>(
    nextAutopayDate(subscription),
  );

  const autopayLabel = autopayEnabled ? 'Autopay is enabled' : 'Autopay is turned off';

  const lastPayments = useMemo(() => payments.slice(0, 10), [payments]);

  const handleStartPayment = () => {
    if (!upcomingInvoice) {
      setError('No open invoices to pay.');
      return;
    }
    setError(null);
    startPayTransition(async () => {
      try {
        const response = await fetch('/api/stripe/checkout', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ invoiceId: upcomingInvoice.id }),
        });

        const data = (await response.json()) as { url?: string; error?: unknown };

        if (!response.ok || !data.url) {
          const message = typeof data.error === 'string' ? data.error : 'Unable to start checkout.';
          setError(message);
          return;
        }

        window.location.href = data.url;
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Unexpected error creating payment.');
      }
    });
  };

  const handleToggleAutopay = (enable: boolean) => {
    setError(null);
    setAutopayEnabled(enable);
    startAutopayTransition(async () => {
      try {
        const result = await toggleAutopay({ enable });
        setAutopayStatus(result.status);
        const nextDate = result.currentPeriodEnd ? new Date(result.currentPeriodEnd) : null;
        setAutopayNextDate(nextDate);
        setAutopayEnabled(enable && result.status !== 'canceled');
      } catch (error) {
        setAutopayEnabled(!enable);
        setError(error instanceof Error ? error.message : 'Unable to update autopay.');
      }
    });
  };

  const nextRenewalText = autopayNextDate ? formatDate(autopayNextDate.toISOString()) : 'Not scheduled';

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current balance</CardTitle>
            <CardDescription>Your outstanding rent across all open invoices.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formattedBalance}</p>
            {upcomingInvoice ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Next payment of {formatCurrency(upcomingInvoice.amount_due, currency)} due on{' '}
                {formatDate(upcomingInvoice.due_date)}.
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">You are all caught up!</p>
            )}
            <Button
              className="mt-4"
              disabled={isPaying || !upcomingInvoice}
              onClick={handleStartPayment}
            >
              {isPaying ? 'Redirecting to Stripe…' : 'Pay now with Stripe Checkout'}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Autopay</CardTitle>
            <CardDescription>Automatically charge your saved payment method every cycle.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium">{autopayLabel}</p>
                <p className="text-sm text-muted-foreground">
                  Status: <span className="font-semibold capitalize">{autopayStatus.replaceAll('_', ' ')}</span>
                </p>
              </div>
              <Switch
                checked={autopayEnabled}
                onCheckedChange={handleToggleAutopay}
                disabled={autopayPending}
                aria-label="Toggle rent autopay"
              />
            </div>
            <div className="rounded-md border border-dashed border-muted-foreground/40 p-3">
              <p className="text-sm font-medium">Next scheduled payment</p>
              <p className="text-sm text-muted-foreground">{nextRenewalText}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/60 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
          <CardDescription>Your most recent payments processed through Stripe.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Charge ID</th>
              </tr>
            </thead>
            <tbody>
              {lastPayments.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground" colSpan={5}>
                    No payments yet.
                  </td>
                </tr>
              ) : (
                lastPayments.map((payment) => (
                  <tr key={payment.id} className="border-b last:border-none">
                    <td className="p-3">{formatDate(payment.paid_at)}</td>
                    <td className="p-3 font-medium">
                      {formatCurrency(payment.amount_paid, payment.currency)}
                    </td>
                    <td className="p-3">
                      <Badge variant={statusBadgeVariant(payment.status)}>
                        {payment.status.replaceAll('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {payment.invoice_id ?? '—'}
                    </td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">
                      {payment.stripe_charge_id ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Open invoices</CardTitle>
          <CardDescription>Track outstanding rent balances and due dates.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2">Due date</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground" colSpan={4}>
                    No invoices available.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b last:border-none">
                    <td className="p-3">{formatDate(invoice.due_date)}</td>
                    <td className="p-3 font-medium">
                      {formatCurrency(invoice.amount_due, invoice.currency)}
                    </td>
                    <td className="p-3">
                      <Badge variant={statusBadgeVariant(invoice.status)}>
                        {invoice.status.replaceAll('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {invoice.description ?? 'Rent payment'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
