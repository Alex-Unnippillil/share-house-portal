import { format, parseISO } from "date-fns"
import {
  Download,
  FileText,
  Image as ImageIcon,
  Paperclip,
  StickyNote,
} from "lucide-react"

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
  PaymentReceiptAttachment,
  PaymentReceiptHistoryEntry,
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

function getAttachmentIcon(type: PaymentReceiptAttachment["type"]) {
  switch (type) {
    case "note":
      return StickyNote
    case "photo":
      return ImageIcon
    default:
      return Paperclip
  }
}

function formatAttachmentTypeLabel(type: PaymentReceiptAttachment["type"]) {
  switch (type) {
    case "note":
      return "Note"
    case "photo":
      return "Photo"
    default:
      return "Document"
  }
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
  const attachmentsOnFile = summary.documentationCount + summary.noteCount

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
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              Documentation on file
            </dt>
            <dd className="text-lg font-semibold">{attachmentsOnFile}</dd>
            <p className="text-xs text-muted-foreground">
              Notes: {summary.noteCount} · Files: {summary.documentationCount}
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
          <div className="min-w-[960px] overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Payment</th>
                  <th className="px-4 py-3 text-left font-medium">Period</th>
                  <th className="px-4 py-3 text-left font-medium">Line items</th>
                  <th className="px-4 py-3 text-left font-medium">Notes &amp; docs</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {receipts.map((receipt) => {
                  const status = statusStyles[receipt.status]
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
                      </td>
                      <td className="p-4">
                        {receipt.attachments?.length ? (
                          <ul className="space-y-2">
                            {receipt.attachments.map((attachment) => {
                              const Icon = getAttachmentIcon(attachment.type)
                              const parsedUploadedAt = parseISO(attachment.uploadedAt)
                              const uploadedAtLabel = Number.isNaN(
                                parsedUploadedAt.getTime(),
                              )
                                ? attachment.uploadedAt
                                : format(parsedUploadedAt, "MMM d, yyyy")

                              return (
                                <li
                                  key={attachment.id}
                                  className="rounded-md border bg-muted/30 p-3"
                                >
                                  <div className="flex items-start gap-3">
                                    <Icon
                                      className="mt-0.5 size-4 text-muted-foreground"
                                      aria-hidden="true"
                                    />
                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-medium text-foreground">
                                          {attachment.label}
                                        </p>
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] uppercase tracking-wide"
                                        >
                                          {formatAttachmentTypeLabel(attachment.type)}
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        {attachment.uploadedBy} · {uploadedAtLabel}
                                      </p>
                                      {attachment.description ? (
                                        <p className="text-xs text-muted-foreground">
                                          {attachment.description}
                                        </p>
                                      ) : null}
                                      {attachment.url ? (
                                        <a
                                          href={attachment.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-xs font-medium text-primary hover:underline"
                                        >
                                          View document
                                        </a>
                                      ) : null}
                                    </div>
                                  </div>
                                </li>
                              )
                            })}
                          </ul>
                        ) : (
                          <p className="text-xs text-muted-foreground">—</p>
                        )}
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
