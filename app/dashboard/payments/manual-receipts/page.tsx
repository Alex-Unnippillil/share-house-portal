import { Metadata } from "next"
import Link from "next/link"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { tenantBillingSettings } from "@/config/tenant-settings"
import {
  fetchActiveInvoiceForTenant,
  generateETransferReference,
} from "@/lib/payments/e-transfer"
import type { Database } from "@/lib/supabase"
import { createSupbaseServerClient } from "@/utils/supaone"

import { ManualReceiptForm } from "./manual-receipt-form"

type PaymentRecord = Database["public"]["Tables"]["payments"]["Row"]

type ReceiptQuery = {
  receipts: PaymentRecord[]
  error: string | null
}

async function loadRecentEtransferReceipts(): Promise<ReceiptQuery> {
  try {
    const supabase = await createSupbaseServerClient()
    const { data, error } = await supabase
      .from("payments")
      .select(
        "id, invoice_id, tenant_name, amount, currency, reference_code, received_at, recorded_by, status",
      )
      .eq("method", "etransfer")
      .order("received_at", { ascending: false })
      .limit(10)

    if (error) {
      console.error("Failed to load manual receipts", error)
      return { receipts: [], error: "Unable to load manual receipts right now." }
    }

    return { receipts: data ?? [], error: null }
  } catch (error) {
    console.error("Unexpected error loading receipts", error)
    return { receipts: [], error: "Unable to load manual receipts right now." }
  }
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export const metadata: Metadata = {
  title: "Manual e-Transfer receipts",
  description:
    "Log Interac e-Transfer payments that arrived outside of Stripe and push them into the payments ledger.",
}

export default async function ManualReceiptsPage() {
  const invoice = await fetchActiveInvoiceForTenant()
  const referenceCode = generateETransferReference(invoice)
  const { receipts, error } = await loadRecentEtransferReceipts()
  const { eTransfer } = tenantBillingSettings

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Manual e-Transfer receipts</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          When an Interac e-Transfer lands outside of Stripe automation you can log the deposit here. We store the
          confirmation alongside invoice {invoice.id} so the tenant ledger and receipts remain accurate.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Record an incoming transfer</CardTitle>
          <CardDescription>
            Use the reference code the tenant entered ({referenceCode}) to avoid duplicate ledger entries. The receipt will
            be stamped as completed once saved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ManualReceiptForm
            defaults={{
              invoiceId: invoice.id,
              tenantId: invoice.tenantId,
              tenantName: invoice.tenantName,
              amount: invoice.amountDue,
              referenceCode,
            }}
          />
          <p className="text-sm text-muted-foreground">
            Need to remind tenants about the process? Share the
            <Link
              href={eTransfer.fallbackDocumentationUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-1 font-medium text-primary underline-offset-4 hover:underline"
            >
              manual e-Transfer fallback guide
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent manual receipts</CardTitle>
          <CardDescription>
            Last ten e-Transfers recorded outside of Stripe. Auto-deposit transfers without a memo code will appear here once
            reconciled by staff.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm font-medium text-destructive">{error}</p>
          ) : receipts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No manual receipts have been captured yet. Entries recorded here will populate this list for quick auditing.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Invoice</th>
                    <th className="px-3 py-2 font-medium">Tenant</th>
                    <th className="px-3 py-2 font-medium">Amount</th>
                    <th className="px-3 py-2 font-medium">Reference</th>
                    <th className="px-3 py-2 font-medium">Received</th>
                    <th className="px-3 py-2 font-medium">Recorded by</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((receipt) => (
                    <tr key={receipt.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium text-foreground">{receipt.invoice_id}</td>
                      <td className="px-3 py-2">{receipt.tenant_name ?? "—"}</td>
                      <td className="px-3 py-2">
                        {formatAmount(receipt.amount ?? 0, receipt.currency ?? invoice.currency)}
                      </td>
                      <td className="px-3 py-2 font-mono">{receipt.reference_code ?? "—"}</td>
                      <td className="px-3 py-2">{receipt.received_at ? formatDateTime(receipt.received_at) : "—"}</td>
                      <td className="px-3 py-2">{receipt.recorded_by ?? "—"}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="uppercase tracking-wide">
                          {receipt.status ?? "processing"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
