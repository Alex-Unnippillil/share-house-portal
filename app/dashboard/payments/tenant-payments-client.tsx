"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import type { Database } from "@/lib/supabase";
import { format } from "date-fns";

const formatCurrency = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch (error) {
    return `${amount.toFixed(2)} ${currency}`;
  }
};

const statusVariant: Record<string, string> = {
  succeeded: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  failed: "bg-rose-100 text-rose-700",
  requires_action: "bg-amber-100 text-amber-700",
};

type RentPayment = Database["public"]["Tables"]["rent_payments"]["Row"];
type BillingSettings = Database["public"]["Tables"]["tenant_billing_settings"]["Row"] | null;
type StripeCustomer = Database["public"]["Tables"]["stripe_customers"]["Row"] | null;
type Profile = Pick<Database["public"]["Tables"]["profiles"]["Row"], "full_name" | "role"> | null;

type TenantPaymentsClientProps = {
  payments: RentPayment[];
  settings: BillingSettings;
  stripeCustomer: StripeCustomer;
  profile: Profile;
};

const getStatusVariant = (status: string) => statusVariant[status] ?? "bg-slate-100 text-slate-700";

const normalizeStatus = (status: string) =>
  status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const sortPayments = (payments: RentPayment[]) =>
  [...payments].sort((a, b) => {
    const dateA = new Date(a.paid_at ?? a.created_at ?? 0).getTime();
    const dateB = new Date(b.paid_at ?? b.created_at ?? 0).getTime();
    return dateB - dateA;
  });

export default function TenantPaymentsClient({
  payments,
  settings,
  stripeCustomer,
  profile,
}: TenantPaymentsClientProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState<string>("");
  const [isAutopayPending, startAutopayTransition] = useTransition();
  const [isPortalPending, startPortalTransition] = useTransition();
  const [isOneTimePending, startOneTimeTransition] = useTransition();
  const [sendingReceiptId, setSendingReceiptId] = useState<string | null>(null);
  const [_, startReceiptTransition] = useTransition();

  const sortedPayments = useMemo(() => sortPayments(payments), [payments]);

  const autopayActive = settings?.autopay_enabled ?? false;
  const autopayDay = settings?.autopay_day ?? undefined;
  const nextAutopayDate = settings?.next_autopay_at
    ? format(new Date(settings.next_autopay_at), "PPP")
    : null;
  const rentAmount = settings?.rent_amount ?? null;
  const currency = settings?.currency ?? "USD";
  const settingsMetadata = (settings?.metadata as Record<string, unknown> | null) ?? {};

  const handleStartAutopay = () => {
    startAutopayTransition(async () => {
      try {
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: "subscription",
            autopayDay: autopayDay ?? 1,
            metadata: {
              initiated_from: "tenant_dashboard",
              payment_kind: "subscription",
              expected_rent_amount: rentAmount ? rentAmount.toString() : undefined,
            },
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.url) {
          throw new Error(data.error ?? "Unable to create checkout session");
        }

        window.location.href = data.url as string;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to start autopay";
        toast({
          title: "Autopay enrollment failed",
          description: message,
          variant: "destructive",
        });
      }
    });
  };

  const handleOpenPortal = () => {
    startPortalTransition(async () => {
      try {
        const response = await fetch("/api/stripe/portal", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        const data = await response.json();

        if (!response.ok || !data.url) {
          throw new Error(data.error ?? "Unable to create billing portal session");
        }

        window.location.href = data.url as string;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to open billing portal";
        toast({
          title: "Billing portal unavailable",
          description: message,
          variant: "destructive",
        });
      }
    });
  };

  const handleOneTimePayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedAmount = Number.parseFloat(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: "Enter a valid amount",
        description: "Please provide a positive rent amount before continuing.",
        variant: "destructive",
      });
      return;
    }

    startOneTimeTransition(async () => {
      try {
        const metadataPayload: Record<string, string> = {
          initiated_from: "tenant_dashboard",
          payment_kind: "one_time",
        };

        if (rentAmount) {
          metadataPayload.expected_rent_amount = rentAmount.toString();
        }

        if (typeof settingsMetadata.billing_period_start === "string") {
          metadataPayload.billing_period_start = settingsMetadata.billing_period_start;
        }

        if (typeof settingsMetadata.billing_period_end === "string") {
          metadataPayload.billing_period_end = settingsMetadata.billing_period_end;
        }

        if (typeof settingsMetadata.unit_label === "string") {
          metadataPayload.unit_label = settingsMetadata.unit_label;
        }

        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: "payment",
            amount: parsedAmount,
            currency,
            metadata: metadataPayload,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.url) {
          throw new Error(data.error ?? "Unable to create payment session");
        }

        setAmount("");
        window.location.href = data.url as string;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to start payment";
        toast({
          title: "Payment checkout failed",
          description: message,
          variant: "destructive",
        });
      }
    });
  };

  const handleSendReceipt = (paymentId: string) => {
    setSendingReceiptId(paymentId);
    startReceiptTransition(async () => {
      try {
        const response = await fetch("/api/payments/receipt", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rentPaymentId: paymentId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to send receipt");
        }

        toast({
          title: "Receipt sent",
          description: "We emailed a copy of the receipt to you.",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to send receipt";
        toast({
          title: "Receipt delivery failed",
          description: message,
          variant: "destructive",
        });
      } finally {
        setSendingReceiptId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Payments</h1>
        <p className="text-sm text-muted-foreground">
          {profile?.full_name ? `Hi ${profile.full_name}, ` : ""}
          manage autopay, make one-off payments, and download rent receipts.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Autopay</CardTitle>
            <CardDescription>
              {autopayActive
                ? "Autopay is active and your rent will be charged automatically."
                : "Enroll in autopay to never miss a rent payment."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Badge className={getStatusVariant(autopayActive ? "succeeded" : "pending")}>
                  {autopayActive ? "Active" : "Inactive"}
                </Badge>
                <div className="text-sm text-muted-foreground">
                  {rentAmount && (
                    <p>
                      Monthly rent: {formatCurrency(Number(rentAmount), currency)}
                    </p>
                  )}
                  {autopayDay && (
                    <p>
                      Charged on day <span className="font-medium">{autopayDay}</span> of each month
                    </p>
                  )}
                  {nextAutopayDate && <p>Next autopay: {nextAutopayDate}</p>}
                  {stripeCustomer?.billing_email && <p>Billing email: {stripeCustomer.billing_email}</p>}
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={handleOpenPortal} disabled={isPortalPending}>
                  {isPortalPending ? "Opening..." : "Billing portal"}
                </Button>
                {!autopayActive && (
                  <Button onClick={handleStartAutopay} disabled={isAutopayPending}>
                    {isAutopayPending ? "Redirecting..." : "Start autopay"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>One-time payment</CardTitle>
            <CardDescription>
              Send a catch-up payment or cover shared utilities in just a few clicks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleOneTimePayment}>
              <div>
                <label className="text-sm font-medium text-muted-foreground" htmlFor="amount">
                  Amount
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    id="amount"
                    inputMode="decimal"
                    placeholder={rentAmount ? rentAmount.toString() : "0.00"}
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                  <Button type="submit" disabled={isOneTimePending}>
                    {isOneTimePending ? "Redirecting..." : "Pay"}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                You will be redirected to Stripe Checkout to securely complete your payment.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
          <CardDescription>Track rent payments and download receipts for your records.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Period</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedPayments.length === 0 && (
                  <tr>
                    <td className="py-6 text-center text-muted-foreground" colSpan={5}>
                      No payments yet. Once you complete a payment, the receipt will appear here.
                    </td>
                  </tr>
                )}
                {sortedPayments.map((payment) => {
                  const paidAt = payment.paid_at ?? payment.created_at;
                  const formattedDate = paidAt ? format(new Date(paidAt), "PP") : "—";
                  const amountLabel = formatCurrency(Number(payment.amount ?? 0), payment.currency ?? "USD");
                  const periodLabel = payment.billing_period_start
                    ? payment.billing_period_end
                      ? `${format(new Date(payment.billing_period_start), "MMM d")} – ${format(
                          new Date(payment.billing_period_end),
                          "MMM d",
                        )}`
                      : format(new Date(payment.billing_period_start), "MMM d")
                    : "—";

                  return (
                    <tr key={payment.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium text-foreground">{formattedDate}</td>
                      <td className="py-3 pr-4">{amountLabel}</td>
                      <td className="py-3 pr-4">
                        <Badge className={getStatusVariant(payment.status)}>
                          {normalizeStatus(payment.status)}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">{periodLabel}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-2">
                          {payment.receipt_url && (
                            <Button asChild size="sm" variant="outline">
                              <a href={payment.receipt_url} target="_blank" rel="noopener noreferrer">
                                View receipt
                              </a>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={sendingReceiptId === payment.id}
                            onClick={() => handleSendReceipt(payment.id)}
                          >
                            {sendingReceiptId === payment.id ? "Sending..." : "Email receipt"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
