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
import { retryPayment } from "../actions";

interface AdminPaymentRecord {
  id: string;
  tenantName: string | null;
  tenantEmail: string | null;
  amountDueCents: number;
  amountPaidCents: number | null;
  currency: string;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  receiptUrl: string | null;
  failureMessage: string | null;
}

interface PaymentStats {
  total: number;
  paid: number;
  pending: number;
  failed: number;
}

interface ManagePaymentsClientProps {
  payments: AdminPaymentRecord[];
  stats: PaymentStats;
}

function formatCurrency(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
  } catch (error) {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
  } catch (error) {
    return value;
  }
}

export function ManagePaymentsClient({ payments, stats }: ManagePaymentsClientProps) {
  const [isRetrying, startRetry] = useTransition();
  const [retryError, setRetryError] = useState<string | null>(null);

  const handleRetry = (id: string) => {
    setRetryError(null);
    startRetry(async () => {
      try {
        await retryPayment(id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setRetryError(message);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Total payments</CardTitle>
            <CardDescription className="text-2xl font-semibold text-foreground">
              {stats.total}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Paid</CardTitle>
            <CardDescription className="text-2xl font-semibold text-foreground">
              {stats.paid}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Pending</CardTitle>
            <CardDescription className="text-2xl font-semibold text-foreground">
              {stats.pending}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Failed</CardTitle>
            <CardDescription className="text-2xl font-semibold text-destructive">
              {stats.failed}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Tenant payments</h2>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => window.open("/api/stripe/payments/export", "_blank")}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {retryError && <p className="text-sm text-destructive">{retryError}</p>}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr className="text-xs uppercase text-muted-foreground">
              <th className="p-3 font-medium">Tenant</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Amount due</th>
              <th className="p-3 font-medium">Paid at</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-muted-foreground">
                  No payments recorded yet.
                </td>
              </tr>
            )}
            {payments.map((payment) => {
              const canRetry = ["failed", "requires_payment_method", "requires_action"].includes(
                payment.status,
              );

              return (
                <tr key={payment.id} className="border-b last:border-0">
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span>{payment.tenantName ?? "Unknown tenant"}</span>
                      {payment.tenantEmail && (
                        <span className="text-xs text-muted-foreground">{payment.tenantEmail}</span>
                      )}
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
                    {payment.failureMessage && (
                      <p className="mt-1 text-xs text-muted-foreground">{payment.failureMessage}</p>
                    )}
                  </td>
                  <td className="p-3">{formatCurrency(payment.amountDueCents, payment.currency)}</td>
                  <td className="p-3">{formatDate(payment.paidAt)}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {payment.receiptUrl && (
                        <Button variant="link" asChild>
                          <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
                            Receipt
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canRetry || isRetrying}
                        onClick={() => handleRetry(payment.id)}
                      >
                        Retry
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
