import { Metadata } from "next"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { tenantBillingSettings } from "@/config/tenant-settings"
import {
  fetchActiveInvoiceForTenant,
  generateETransferReference,
} from "@/lib/payments/e-transfer"

import { ReferenceCodeCard } from "./reference-code-card"

export const metadata: Metadata = {
  title: "Pay by e-Transfer",
  description:
    "Generate a unique memo code for your rent invoice and follow the tenant-specific Interac e-Transfer instructions.",
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "long",
  }).format(new Date(value))
}

export default async function TenantETransferPage() {
  const invoice = await fetchActiveInvoiceForTenant()
  const referenceCode = generateETransferReference(invoice)
  const { eTransfer } = tenantBillingSettings

  return (
    <div className="container max-w-5xl space-y-10 py-12">
      <header className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Pay rent with Interac e-Transfer
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            We generate a memo code that links your transfer directly to invoice {invoice.id}. Follow the
            instructions below so our ledger can auto-match the deposit without delays.
          </p>
        </div>
        <Separator />
      </header>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{invoice.periodLabel}</CardTitle>
            <CardDescription>
              Issued {formatDate(invoice.issuedAt)} • Due {formatDate(invoice.dueDate)} • {invoice.unitLabel}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Amount due</p>
              <p className="text-3xl font-semibold tracking-tight">
                {formatCurrency(invoice.amountDue, invoice.currency)}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="uppercase tracking-wide">
                  {invoice.status === "open" ? "Balance due" : invoice.status}
                </Badge>
                <span>Invoice {invoice.id}</span>
              </div>
            </div>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="font-medium text-muted-foreground">Tenant</dt>
                <dd className="text-base">{invoice.tenantName}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Lease</dt>
                <dd className="text-base">{invoice.leaseId}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Unit</dt>
                <dd className="text-base">{invoice.unitLabel}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <ReferenceCodeCard
          code={referenceCode}
          memoLabel={eTransfer.memoLabel}
          documentationUrl={eTransfer.fallbackDocumentationUrl}
          invoiceId={invoice.id}
        />

        <Card>
          <CardHeader>
            <CardTitle>Send the Interac e-Transfer</CardTitle>
            <CardDescription>
              Use the registered auto-deposit contact so the transfer is accepted instantly by {eTransfer.recipientName}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-4 text-sm">
              <p className="font-medium">Deposit email</p>
              <p className="font-mono text-base">{eTransfer.depositEmail}</p>
              <p className="mt-2 text-muted-foreground">
                Auto-deposit is enabled, so no security question is required. Transfers sent after {eTransfer.dailyDepositCutoff}
                will post the next morning.
              </p>
            </div>
            <ol className="space-y-3 text-sm text-muted-foreground">
              {eTransfer.instructions.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="mt-0.5 inline-flex size-6 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What happens after you send the transfer</CardTitle>
            <CardDescription>
              We reconcile deposits in batches throughout the day. Keep the bank confirmation until your receipt is generated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <Badge variant="secondary" className="mt-1 uppercase tracking-wide">
                Auto-match window
              </Badge>
              <p>
                Expect a receipt within {eTransfer.confirmationWindowHours} hours when the memo reference is present. Missing codes
                fall back to manual review which can take longer.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="secondary" className="mt-1 uppercase tracking-wide">
                Need assistance?
              </Badge>
              <p>
                If the transfer still shows as pending after the window above, share the bank confirmation with support and include
                your reference code. You can also review the
                <Link
                  href={eTransfer.fallbackDocumentationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-1 font-medium text-primary underline-offset-4 hover:underline"
                >
                  fallback checklist
                </Link>
                for next steps.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
