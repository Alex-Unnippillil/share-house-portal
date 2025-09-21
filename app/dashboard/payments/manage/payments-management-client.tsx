"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type RentPaymentWithProfile = Database["public"]["Tables"]["rent_payments"]["Row"] & {
  profiles: Pick<Database["public"]["Tables"]["profiles"]["Row"], "full_name" | "email" | "role"> | null;
  tenant_settings: Pick<Database["public"]["Tables"]["tenant_billing_settings"]["Row"], "rent_amount" | "currency"> | null;
};

type Props = {
  payments: RentPaymentWithProfile[];
  viewerRole: string;
};

const statusOptions = [
  { value: "all", label: "All" },
  { value: "succeeded", label: "Succeeded" },
  { value: "processing", label: "Processing" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
];

const getStatusVariant = (status: string) => {
  switch (status) {
    case "succeeded":
      return "bg-emerald-100 text-emerald-700";
    case "failed":
      return "bg-rose-100 text-rose-700";
    case "processing":
    case "requires_action":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
};

const normalizeStatus = (status: string) =>
  status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export default function ManagementPaymentsClient({ payments, viewerRole }: Props) {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const defaultCurrency = payments[0]?.currency ?? "USD";

  const summary = useMemo(() => {
    return payments.reduce(
      (acc, payment) => {
        const amount = Number(payment.amount ?? 0);
        switch (payment.status) {
          case "succeeded":
            acc.collected += amount;
            break;
          case "failed":
            acc.failed += amount;
            break;
          default:
            acc.pending += amount;
            break;
        }
        return acc;
      },
      { collected: 0, failed: 0, pending: 0 },
    );
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const query = searchTerm.toLowerCase();

    return payments.filter((payment) => {
      if (statusFilter !== "all" && payment.status !== statusFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const name = payment.profiles?.full_name?.toLowerCase() ?? "";
      const email = payment.profiles?.email?.toLowerCase() ?? "";
      const intent = payment.stripe_payment_intent_id?.toLowerCase() ?? "";
      const invoice = payment.stripe_invoice_id?.toLowerCase() ?? "";

      return (
        name.includes(query) ||
        email.includes(query) ||
        intent.includes(query) ||
        invoice.includes(query) ||
        payment.id.toLowerCase().includes(query)
      );
    });
  }, [payments, statusFilter, searchTerm]);

  const handleRetry = async (payment: RentPaymentWithProfile) => {
    setRetryingId(payment.id);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "payment",
          amount: Number(payment.amount ?? 0),
          currency: payment.currency ?? defaultCurrency,
          targetProfileId: payment.profile_id,
          metadata: {
            retry_of: payment.stripe_payment_intent_id ?? payment.id,
            initiated_from: "management_dashboard",
            original_status: payment.status,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Unable to create checkout session");
      }

      toast({
        title: "Stripe Checkout ready",
        description: "A new payment session opened in a separate tab.",
      });
      window.open(data.url as string, "_blank", "noopener,noreferrer");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to retry payment";
      toast({
        title: "Retry failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setRetryingId(null);
    }
  };

  const handleExport = () => {
    const header = [
      "Tenant",
      "Email",
      "Status",
      "Amount",
      "Currency",
      "Paid At",
      "Created At",
      "Payment Intent",
      "Invoice",
    ];

    const rows = filteredPayments.map((payment) => [
      payment.profiles?.full_name ?? "",
      payment.profiles?.email ?? "",
      payment.status,
      Number(payment.amount ?? 0).toFixed(2),
      payment.currency ?? defaultCurrency,
      payment.paid_at ?? "",
      payment.created_at ?? "",
      payment.stripe_payment_intent_id ?? "",
      payment.stripe_invoice_id ?? "",
    ]);

    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rent-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Payment operations</h1>
        <p className="text-sm text-muted-foreground">
          Monitor rent collections, retry failed payments, and export finance-ready CSVs.
        </p>
        <Badge variant="outline" className="mt-1">
          {normalizeStatus(viewerRole)} view
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Collected</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(summary.collected, defaultCurrency)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(summary.pending, defaultCurrency)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(summary.failed, defaultCurrency)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Segment payments by status or tenant name.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="w-full md:w-64">
            <label className="text-sm font-medium text-muted-foreground">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:flex-1">
            <label className="text-sm font-medium text-muted-foreground">Search</label>
            <Input
              className="mt-2"
              placeholder="Search by tenant, email, or Stripe reference"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rent payments</CardTitle>
          <CardDescription>Latest rent activity across all tenants.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-4">Tenant</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Updated</th>
                  <th className="py-2 pr-4">Receipt</th>
                  <th className="py-2 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 && (
                  <tr>
                    <td className="py-6 text-center text-muted-foreground" colSpan={6}>
                      No payments match your filters.
                    </td>
                  </tr>
                )}
                {filteredPayments.map((payment) => {
                  const paidAt = payment.paid_at ?? payment.updated_at ?? payment.created_at;
                  const displayDate = paidAt ? format(new Date(paidAt), "PP") : "—";
                  const tenantName = payment.profiles?.full_name ?? "Unknown";
                  const amount = formatCurrency(Number(payment.amount ?? 0), payment.currency ?? defaultCurrency);

                  return (
                    <tr key={payment.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <div className="font-medium text-foreground">{tenantName}</div>
                        <div className="text-xs text-muted-foreground">
                          {payment.profiles?.email ?? "No email on file"}
                        </div>
                        {payment.tenant_settings?.rent_amount != null && (
                          <div className="text-xs text-muted-foreground">
                            Scheduled rent:
                            {" "}
                            {formatCurrency(
                              Number(payment.tenant_settings.rent_amount ?? 0),
                              payment.tenant_settings.currency ?? defaultCurrency,
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4">{amount}</td>
                      <td className="py-3 pr-4">
                        <Badge className={getStatusVariant(payment.status)}>
                          {normalizeStatus(payment.status)}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">{displayDate}</td>
                      <td className="py-3 pr-4">
                        {payment.receipt_url ? (
                          <Button asChild size="sm" variant="outline">
                            <a href={payment.receipt_url} target="_blank" rel="noopener noreferrer">
                              View receipt
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not available</span>
                        )}
                      </td>
                      <td className="py-3 pr-0 text-right">
                        <div className="flex justify-end gap-2">
                          {payment.status !== "succeeded" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={retryingId === payment.id}
                              onClick={() => handleRetry(payment)}
                            >
                              {retryingId === payment.id ? "Starting..." : "Retry"}
                            </Button>
                          )}
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
