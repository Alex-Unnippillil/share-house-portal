import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import type { RentLedgerEntry } from '../actions'
import { formatCurrency, formatDate } from '../utils'

type ChargesTableProps = {
  ledger: RentLedgerEntry[]
}

export function ChargesTable({ ledger }: ChargesTableProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Current charges</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">Due date</th>
                <th className="px-3 py-2 text-left font-medium">Description</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 text-right font-medium">Paid</th>
                <th className="px-3 py-2 text-right font-medium">Balance</th>
                <th className="px-3 py-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ledger.length ? (
                ledger.map((entry) => {
                  const currency = entry.invoice.currency ?? 'usd'
                  const statusLabel = entry.isOverdue
                    ? 'Overdue'
                    : entry.invoice.status.replace(/_/g, ' ')
                  const statusVariant: 'destructive' | 'complete' | 'secondary' = entry.isOverdue
                    ? 'destructive'
                    : entry.invoice.status === 'paid'
                      ? 'complete'
                      : 'secondary'

                  return (
                    <tr key={entry.invoice.id} className="align-top">
                      <td className="whitespace-nowrap p-3">{formatDate(entry.invoice.due_date)}</td>
                      <td className="p-3 text-muted-foreground">
                        {entry.invoice.description ?? 'Rent'}
                      </td>
                      <td className="whitespace-nowrap p-3 text-right font-medium">
                        {formatCurrency(entry.amountDue, currency)}
                      </td>
                      <td className="whitespace-nowrap p-3 text-right text-muted-foreground">
                        {formatCurrency(entry.paid, currency)}
                      </td>
                      <td className="whitespace-nowrap p-3 text-right">
                        <span className={entry.balance > 0 ? 'font-semibold text-destructive' : undefined}>
                          {formatCurrency(entry.balance, currency)}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Badge variant={statusVariant}>{statusLabel}</Badge>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    You&apos;re all caught up. New invoices will appear here as soon as they&apos;re posted.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
