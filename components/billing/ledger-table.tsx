import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrencyFromCents } from "@/lib/utils"

export type LedgerEntry = {
  id: string
  created_at: string
  amount_cents: number
  reason: string
  memo?: string | null
  type: "credit" | "reversal"
  created_by: string
  invoice?: {
    id: string
    reference?: string | null
    currency?: string | null
  } | null
  actor?: {
    full_name?: string | null
    email?: string | null
  } | null
}

type LedgerTableProps = {
  adjustments: LedgerEntry[]
}

const adjustmentLabels: Record<LedgerEntry["type"], { label: string; tone: string }> = {
  credit: { label: "Credit", tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" },
  reversal: { label: "Reversal", tone: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}

export function LedgerTable({ adjustments }: LedgerTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ledger adjustments</CardTitle>
        <CardDescription>Recent credits and reversals applied to resident invoices.</CardDescription>
      </CardHeader>
      <CardContent>
        {adjustments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No adjustments have been recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-[160px] py-2 pr-4">Timestamp</th>
                  <th className="w-[160px] py-2 pr-4">Invoice</th>
                  <th className="w-[120px] py-2 pr-4">Type</th>
                  <th className="w-[140px] py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Reason</th>
                  <th className="w-[180px] py-2">Entered by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {adjustments.map((entry) => {
                  const invoiceLabel = entry.invoice?.reference ?? entry.invoice?.id ?? "Invoice"
                  const actorLabel = entry.actor?.full_name ?? entry.actor?.email ?? "System"
                  const currency = entry.invoice?.currency ?? "USD"
                  const amount = formatCurrencyFromCents(Math.abs(entry.amount_cents), currency)
                  const adjustment = adjustmentLabels[entry.type]

                  return (
                    <tr key={entry.id} className="align-top">
                      <td className="py-3 pr-4 font-medium text-foreground">{formatDateTime(entry.created_at)}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{invoiceLabel}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="secondary" className={adjustment.tone}>
                          {adjustment.label}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 font-medium text-foreground">
                        {entry.type === "credit" ? "-" : "+"}
                        {amount}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        <div>{entry.reason}</div>
                        {entry.memo && <div className="text-xs text-muted-foreground/80">{entry.memo}</div>}
                      </td>
                      <td className="py-3 text-muted-foreground">{actorLabel}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
