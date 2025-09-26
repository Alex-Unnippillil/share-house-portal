import { format, parseISO } from "date-fns"
import { Download, FileText } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/payments/currency"
import {
  createPaymentHistoryCsv,
  summarizeReceiptHistory,
} from "@/lib/payments/receipts"
import type {
  PaymentReceiptHistoryEntry,
  PaymentReceiptTaxBreakdown,
} from "@/types/payments"

interface ReceiptHistoryCardProps {
  receipts: PaymentReceiptHistoryEntry[]
}

const statusStyles: Record<
  PaymentReceiptHistoryEntry["status"],
  { label: string; variant: "secondary" | "outline" | "destructive" }
> = {
  paid: { label: "Paid", variant: "secondary" },
  processing: { label: "Processing", variant: "outline" },
  refunded: { label: "Refunded", variant: "destructive" },
}

function formatPeriod(
  periodStart: string | undefined,
  periodEnd: string | undefined,
) {
  if (!periodStart && !periodEnd) {
    return "—"
  }

  if (periodStart && periodEnd) {
    const start = format(parseISO(periodStart), "MMM d")
    const end = format(parseISO(periodEnd), "MMM d, yyyy")
    return `${start} – ${end}`
  }

  const singleDate = periodStart ?? periodEnd
  return singleDate ? format(parseISO(singleDate), "MMM d, yyyy") : "—"
}

function encodeCsvForDownload(content: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(content)}`
}

function formatTaxRate(rate: number | null | undefined) {
  if (rate == null) {
    return null
  }

  const formatted = (rate * 100).toFixed(2)
  return formatted.endsWith(".00") ? `${formatted.slice(0, -3)}%` : `${formatted}%`
}

function renderReceiptTaxDetails(
  details: PaymentReceiptHistoryEntry["taxDetails"],
  currency: string,
) {
  if (!details) {
    return null
  }

  if (Array.isArray(details) && details.length > 0) {
    const entries = details as PaymentReceiptTaxBreakdown[]
    return (
      <div className="mt-3 space-y-1 rounded-md bg-muted/40 p-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Tax breakdown
        </p>
        <ul className="space-y-1">
          {entries.map((entry, index) => {
            const taxRateLabel = formatTaxRate(entry.rate)
            return (
              <li
                key={`${entry.label}-${index}`}
                className="flex items-start justify-between gap-2 text-xs"
              >
                <div className="max-w-[220px] space-y-0.5 text-muted-foreground">
                  <span className="block text-sm font-medium text-foreground">
                    {entry.label}
                  </span>
                  {entry.jurisdiction ? (
                    <span className="block text-[11px] uppercase tracking-wide text-muted-foreground/80">
                      {entry.jurisdiction}
                    </span>
                  ) : null}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {taxRateLabel ? (
                    <span className="mr-2 font-medium text-foreground">
                      {taxRateLabel}
                    </span>
                  ) : null}
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(entry.amount, currency)}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  if (!Array.isArray(details)) {
    return (
      <div className="mt-3 rounded-md bg-muted/40 p-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Tax details
        </p>
        <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-muted-foreground">
          {JSON.stringify(details, null, 2)}
        </pre>
      </div>
    )
  }

  return null
}

export function ReceiptHistoryCard({ receipts }: ReceiptHistoryCardProps) {
  if (!receipts.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Receipt history</CardTitle>
          <CardDescription>
            Download Stripe-issued receipts once you have completed your first
            payment cycle.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const summary = summarizeReceiptHistory(receipts)
  const csvContent = createPaymentHistoryCsv(receipts)
  const csvDownloadHref = encodeCsvForDownload(csvContent)

  const currentYear = new Date().getFullYear()
  const paidReceiptsThisYear = receipts.filter((receipt) => {
    const paymentDate = new Date(receipt.paymentDate)
    return (
      !Number.isNaN(paymentDate.getTime()) &&
      paymentDate.getFullYear() === currentYear &&
      receipt.status === "paid"
    )
  }).length

  const lastReceiptLabel = summary.lastReceiptDate
    ? format(parseISO(summary.lastReceiptDate), "MMM d, yyyy")
    : "—"

  const defaultCurrency = receipts[0]?.currency ?? "USD"

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle>Receipt history</CardTitle>
          <CardDescription>
            Download itemized receipts and export the full payment ledger for
            reimbursements, tax season, or dispute resolution.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={csvDownloadHref}
            download="roomsily-payment-history.csv"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "inline-flex items-center gap-2"
            )}
          >
            <Download className="size-4" aria-hidden="true" />
            <span>Export CSV</span>
          </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1 rounded-lg border bg-muted/30 p-4">
            <dt className="text-xs font-medium uppercase text-muted-foreground">
              Receipts YTD
            </dt>
            <dd className="text-lg font-semibold">
              {paidReceiptsThisYear}
            </dd>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(summary.yearToDateAmount, defaultCurrency)}
              {" total processed"}
            </p>
          </div>
          <div className="space-y-1 rounded-lg border bg-muted/30 p-4">
            <dt className="text-xs font-medium uppercase text-muted-foreground">
              Reimbursable line items
            </dt>
            <dd className="text-lg font-semibold">
              {summary.reimbursableLineItems}
            </dd>
            <p className="text-xs text-muted-foreground">
              Utilities, fees, and maintenance tracked for audits
            </p>
          </div>
          <div className="space-y-1 rounded-lg border bg-muted/30 p-4">
            <dt className="text-xs font-medium uppercase text-muted-foreground">
              Last receipt issued
            </dt>
            <dd className="text-lg font-semibold">{lastReceiptLabel}</dd>
            <p className="text-xs text-muted-foreground">
              Stay audit-ready with consolidated records
            </p>
          </div>
        </dl>
        <ScrollArea className="max-h-[540px]">
          <div className="min-w-[760px] overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Payment</th>
                  <th className="px-4 py-3 text-left font-medium">Period</th>
                  <th className="px-4 py-3 text-left font-medium">Line items</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {receipts.map((receipt) => {
                  const status = statusStyles[receipt.status]
                  const taxRateLabel = formatTaxRate(receipt.taxRate)
                  return (
                    <tr key={receipt.id} className="align-top">
                      <td className="p-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {receipt.issuedTo}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(receipt.paymentDate), "MMM d, yyyy")} · {receipt.paymentMethod}
                          </p>
                          {receipt.memo ? (
                            <p className="text-xs text-muted-foreground">
                              {receipt.memo}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatPeriod(receipt.periodStart, receipt.periodEnd)}
                      </td>
                      <td className="p-4">
                        <ul className="space-y-1">
                          {receipt.lineItems.map((item) => (
                            <li
                              key={item.id}
                              className="flex items-start justify-between gap-3 text-xs text-muted-foreground"
                            >
                              <span className="max-w-[220px] text-sm text-foreground">
                                {item.description}
                              </span>
                              <span
                                className={cn(
                                  "text-sm font-medium",
                                  item.totalAmount < 0 && "text-destructive",
                                )}
                              >
                                {formatCurrency(item.totalAmount, receipt.currency)}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {renderReceiptTaxDetails(receipt.taxDetails, receipt.currency)}
                      </td>
                      <td className="p-4 text-right">
                        <div
                          className={cn(
                            "text-sm font-semibold",
                            receipt.amount < 0 && "text-destructive",
                          )}
                        >
                          {formatCurrency(receipt.amount, receipt.currency)}
                        </div>
                        {receipt.amount < 0 ? (
                          <p className="text-xs text-muted-foreground">Credit issued</p>
                        ) : null}
                        {receipt.taxAmount != null ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Tax{taxRateLabel ? ` (${taxRateLabel})` : ""}:{" "}
                            <span className="font-medium text-foreground">
                              {formatCurrency(receipt.taxAmount, receipt.currency)}
                            </span>
                          </p>
                        ) : null}
                      </td>
                      <td className="p-4">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col items-end gap-2">
                          <a
                            href={receipt.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={cn(
                              buttonVariants({ variant: "outline", size: "sm" }),
                              "w-full justify-center gap-1"
                            )}
                          >
                            <Download className="size-4" aria-hidden="true" />
                            <span>Receipt</span>
                          </a>
                          {receipt.invoiceUrl ? (
                            <a
                              href={receipt.invoiceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={cn(
                                buttonVariants({ variant: "ghost", size: "sm" }),
                                "w-full justify-center gap-1"
                              )}
                            >
                              <FileText className="size-4" aria-hidden="true" />
                              <span>Invoice</span>
                            </a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
