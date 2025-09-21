"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PaymentLineItem } from "@/lib/payments/types";

interface TenantPaymentRecord {
  id: string;
  amountDueCents: number;
  amountPaidCents: number | null;
  currency: string;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  receiptUrl: string | null;
  description: string | null;
  lineItems: PaymentLineItem[];
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
}

interface TenantPaymentsClientProps {
  profileName?: string | null;
  billingMetadata?: {
    autopay_enabled: boolean;
    autopay_status: string | null;
    monthly_rent_cents: number | null;
    currency: string;
    next_billing_date: string | null;
    stripe_subscription_id: string | null;
  } | null;
  payments: TenantPaymentRecord[];
}

function formatCurrency(cents: number | null | undefined, currency: string) {
  if (!cents || cents <= 0) {
    return "—";
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(cents / 100);
  } catch (error) {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
}

export function TenantPaymentsClient({
  profileName,
  billingMetadata,
  payments,
}: TenantPaymentsClientProps) {
  const [isProcessing, startProcessing] = useTransition();
  const [isPortalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autopayEnabled = billingMetadata?.autopay_enabled ?? false;
  const autopayStatus = billingMetadata?.autopay_status ?? "inactive";
  const currency = billingMetadata?.currency ?? "usd";
  const monthlyRentCents = billingMetadata?.monthly_rent_cents ?? null;

  const handleCheckout = async (
    payload: Record<string, unknown>,
  ): Promise<void> => {
    setError(null);

    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Unable to start checkout. Please try again.");
      return;
    }

    const data = await response.json();

    if (data?.url) {
      window.location.href = data.url;
    }
  };

  const handleOneTimePayment = () => {
    if (!monthlyRentCents) {
      setError("We need your rent amount before starting a payment.");
      return;
    }

    startProcessing(async () => {
      await handleCheckout({
        mode: "payment",
        amount: monthlyRentCents,
        currency,
        metadata: {
          reason: "one_time_rent_payment",
        },
      });
    });
  };

  const handleEnrollAutopay = () => {
    if (!monthlyRentCents) {
      setError("We need your rent amount before enrolling in autopay.");
      return;
    }

    startProcessing(async () => {
      await handleCheckout({
        mode: "subscription",
        lineItems: [
          {
            amount: monthlyRentCents,
            currency,
            description: "Monthly rent",
            recurring: { interval: "month" },
          },
        ],
        metadata: {
          reason: "autopay_enrollment",
        },
      });
    });
  };

  const handleBillingPortal = async () => {
    setError(null);
    setPortalLoading(true);

    try {
      const response = await fetch("/api/stripe/billing-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Unable to open billing portal.");
      }

      const data = await response.json();

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message);
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Rent autopay</CardTitle>
          <CardDescription>
            {autopayEnabled
              ? `${profileName ?? "You"} are enrolled in automatic rent payments.`
              : "Set up autopay so rent is collected automatically each month."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant={autopayEnabled ? "default" : "secondary"}>
              {autopayEnabled ? "Autopay active" : `Status: ${autopayStatus}`}
            </Badge>
            {billingMetadata?.next_billing_date && (
              <span className="text-sm text-muted-foreground">
                Next charge {formatDate(billingMetadata.next_billing_date)}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleOneTimePayment}
              disabled={isProcessing || !monthlyRentCents}
            >
              Make one-time payment
            </Button>
            <Button
              variant="outline"
              onClick={handleEnrollAutopay}
              disabled={isProcessing || autopayEnabled || !monthlyRentCents}
            >
              {autopayEnabled ? "Autopay enabled" : "Enroll in autopay"}
            </Button>
            <Button
              variant="secondary"
              onClick={handleBillingPortal}
              disabled={isPortalLoading}
            >
              Manage payment methods
            </Button>
          </div>
          {monthlyRentCents && (
            <p className="text-sm text-muted-foreground">
              Monthly rent: {formatCurrency(monthlyRentCents, currency)}
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
          <CardDescription>
            Review past rent payments and access receipts for your records.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr className="text-xs uppercase text-muted-foreground">
                <th className="p-3 font-medium">Period</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Due</th>
                <th className="p-3 font-medium">Paid</th>
                <th className="p-3 font-medium">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-muted-foreground">
                    No rent payments recorded yet.
                  </td>
                </tr>
              )}
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b last:border-0">
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span>{payment.description ?? "Rent"}</span>
                      <span className="text-xs text-muted-foreground">
                        {payment.billingPeriodStart
                          ? `${formatDate(payment.billingPeriodStart)} → ${formatDate(payment.billingPeriodEnd)}`
                          : payment.dueDate
                            ? `Due ${formatDate(payment.dueDate)}`
                            : "—"}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge
                      variant={
                        payment.status === "paid"
                          ? "default"
                          : payment.status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {payment.status}
                    </Badge>
                  </td>
                  <td className="p-3">{formatCurrency(payment.amountDueCents, payment.currency)}</td>
                  <td className="p-3">{formatCurrency(payment.amountPaidCents, payment.currency)}</td>
                  <td className="p-3">
                    {payment.receiptUrl ? (
                      <Button variant="link" asChild>
                        <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
                          View receipt
                        </a>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
