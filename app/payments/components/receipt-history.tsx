"use client"

import { useMemo, useState } from "react"
import { Download, DownloadCloud, FileText } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ReceiptLineItem {
  label: string
  amount: number
}

interface ReceiptEntry {
  id: string
  period: string
  postedAt: string
  amount: number
  method: string
  status: "paid" | "processing" | "refunded"
  lineItems: ReceiptLineItem[]
  notes?: string
}

const receiptHistory: ReceiptEntry[] = [
  {
    id: "rcpt_2024_07",
    period: "July 2024",
    postedAt: "2024-07-01T08:15:00-04:00",
    amount: 1825,
    method: "ACH ·••1234",
    status: "paid",
    lineItems: [
      { label: "Rent", amount: 1500 },
      { label: "Utilities true-up", amount: 195 },
      { label: "Parking", amount: 130 },
    ],
    notes: "Autopay cleared on first attempt.",
  },
  {
    id: "rcpt_2024_06",
    period: "June 2024",
    postedAt: "2024-06-01T08:10:00-04:00",
    amount: 1785,
    method: "ACH ·••1234",
    status: "paid",
    lineItems: [
      { label: "Rent", amount: 1500 },
      { label: "Utilities", amount: 185 },
      { label: "Pet fee", amount: 100 },
    ],
    notes: "Includes prorated pet fee for Murphy.",
  },
  {
    id: "rcpt_2024_05",
    period: "May 2024",
    postedAt: "2024-05-01T08:20:00-04:00",
    amount: 1695,
    method: "Visa 4242",
    status: "processing",
    lineItems: [
      { label: "Rent", amount: 1500 },
      { label: "Utilities credit", amount: -55 },
      { label: "Maintenance reimbursement", amount: 250 },
    ],
    notes: "Card payment pending settlement—expected within 2 business days.",
  },
  {
    id: "rcpt_2024_04",
    period: "April 2024",
    postedAt: "2024-04-01T08:05:00-04:00",
    amount: 1880,
    method: "ACH ·••1234",
    status: "paid",
    lineItems: [
      { label: "Rent", amount: 1500 },
      { label: "Utilities", amount: 180 },
      { label: "Storage locker", amount: 200 },
    ],
  },
  {
    id: "rcpt_2024_03",
    period: "March 2024",
    postedAt: "2024-03-01T08:12:00-04:00",
    amount: 1500,
    method: "ACH ·••1234",
    status: "refunded",
    lineItems: [
      { label: "Rent", amount: 1500 },
    ],
    notes: "Refund issued after roommate transfer request.",
  },
]

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
})

function createCsvContent(entries: ReceiptEntry[]): string {
  const header = [
    "Receipt ID",
    "Period",
    "Posted",
    "Amount",
    "Status",
    "Method",
    "Line items",
  ]

  const rows = entries.map((entry) => {
    const lineItemSummary = entry.lineItems
      .map((item) => `${item.label}: ${currencyFormatter.format(item.amount)}`)
      .join(" | ")

    return [
      entry.id,
      entry.period,
      dateFormatter.format(new Date(entry.postedAt)),
      entry.amount.toFixed(2),
      entry.status,
      entry.method,
      lineItemSummary,
    ]
  })

  return [header, ...rows]
    .map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(","))
    .join("\n")
}

function downloadBlob(data: BlobPart, filename: string, type = "text/plain") {
  const blob = new Blob([data], { type })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

export function ReceiptHistory() {
  const [yearFilter, setYearFilter] = useState<string>("all")

  const availableYears = useMemo(() => {
    const uniqueYears = new Set(
      receiptHistory.map((entry) => new Date(entry.postedAt).getFullYear().toString()),
    )
    return Array.from(uniqueYears).sort((a, b) => Number(b) - Number(a))
  }, [])

  const filteredReceipts = useMemo(() => {
    if (yearFilter === "all") {
      return receiptHistory
    }

    return receiptHistory.filter(
      (entry) => new Date(entry.postedAt).getFullYear().toString() === yearFilter,
    )
  }, [yearFilter])

  const totalForFilter = useMemo(
    () => filteredReceipts.reduce((total, entry) => total + entry.amount, 0),
    [filteredReceipts],
  )

  const handleDownloadReceipt = (entry: ReceiptEntry) => {
    const content = [
      `Receipt: ${entry.period}`,
      `Generated: ${dateFormatter.format(new Date(entry.postedAt))}`,
      `Total paid: ${currencyFormatter.format(entry.amount)}`,
      `Status: ${entry.status}`,
      `Method: ${entry.method}`,
      "",
      "Line items:",
      ...entry.lineItems.map(
        (item) => `  - ${item.label}: ${currencyFormatter.format(item.amount)}`,
      ),
      entry.notes ? `\nNotes: ${entry.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n")

    downloadBlob(content, `${entry.id}.txt`)
  }

  const handleExportCsv = () => {
    const csv = createCsvContent(filteredReceipts)
    downloadBlob(csv, "payment-history.csv", "text/csv;charset=utf-8;")
  }

  const statusVariant = (status: ReceiptEntry["status"]) => {
    switch (status) {
      case "paid":
        return "complete" as const
      case "processing":
        return "secondary" as const
      case "refunded":
        return "destructive" as const
      default:
        return "default" as const
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-2xl">Receipt history</CardTitle>
          <CardDescription>
            Download itemized receipts, review roommate adjustments, and export a consolidated ledger when you need supporting
            paperwork.
          </CardDescription>
        </div>
        <div className="flex flex-col gap-3 sm:w-60">
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter by year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All receipts</SelectItem>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportCsv} className="justify-start">
            <DownloadCloud className="mr-2 size-4" aria-hidden="true" /> Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border bg-muted/40 p-4 text-sm sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-foreground">{filteredReceipts.length} receipts</p>
            <p className="text-muted-foreground">
              Totaling {currencyFormatter.format(totalForFilter)} for the selected range
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2 text-muted-foreground sm:mt-0">
            <FileText className="size-4" aria-hidden="true" />
            <span>Includes roommate adjustments and reimbursements</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-3 pr-4 font-medium">Period</th>
                <th className="py-3 pr-4 font-medium">Posted</th>
                <th className="py-3 pr-4 font-medium">Amount</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 pr-4 font-medium">Line items</th>
                <th className="py-3 pl-4 text-right font-medium">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.map((entry) => (
                <tr key={entry.id} className="border-b last:border-b-0">
                  <td className="whitespace-nowrap py-4 pr-4 font-medium text-foreground">
                    {entry.period}
                    <div className="text-xs text-muted-foreground">{entry.method}</div>
                  </td>
                  <td className="whitespace-nowrap py-4 pr-4 text-muted-foreground">
                    {dateFormatter.format(new Date(entry.postedAt))}
                  </td>
                  <td className="whitespace-nowrap py-4 pr-4 font-semibold text-foreground">
                    {currencyFormatter.format(entry.amount)}
                  </td>
                  <td className="py-4 pr-4">
                    <Badge variant={statusVariant(entry.status)} className="capitalize">
                      {entry.status}
                    </Badge>
                  </td>
                  <td className="py-4 pr-4">
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {entry.lineItems.map((item) => (
                        <li key={`${entry.id}-${item.label}`} className="flex items-center justify-between gap-4">
                          <span>{item.label}</span>
                          <span className="font-medium text-foreground">
                            {currencyFormatter.format(item.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {entry.notes ? (
                      <p className="mt-2 text-xs text-muted-foreground">{entry.notes}</p>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap py-4 pl-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadReceipt(entry)}
                      className="text-primary hover:text-primary"
                    >
                      <Download className="mr-2 size-4" aria-hidden="true" /> Download
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredReceipts.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No receipts found for the selected year. Adjust your filters to view archived history.
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
