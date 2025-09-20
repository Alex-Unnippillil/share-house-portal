import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import type { RentLedgerInvoice } from "../actions"

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

type RentChargesTableProps = {
  invoices: RentLedgerInvoice[]
}

const statusVariant: Record<RentLedgerInvoice["status"], "default" | "secondary" | "destructive" | "complete" | "outline"> = {
  draft: "secondary",
  open: "default",
  overdue: "destructive",
  paid: "complete",
  void: "outline",
}

export function RentChargesTable({ invoices }: RentChargesTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Current charges</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[560px] table-fixed text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Period</th>
              <th className="px-3 py-2 font-medium">Due</th>
              <th className="px-3 py-2 font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">Paid</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={5}>
                  You&apos;re all caught up—no open invoices.
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.id} className="border-t">
                  <td className="p-3">
                    {invoice.periodStart && invoice.periodEnd
                      ? `${dateFormatter.format(new Date(invoice.periodStart))} – ${dateFormatter.format(new Date(invoice.periodEnd))}`
                      : dateFormatter.format(new Date(invoice.dueDate))}
                  </td>
                  <td className="p-3">
                    {dateFormatter.format(new Date(invoice.dueDate))}
                  </td>
                  <td className="p-3 font-medium">
                    {currency.format(invoice.amount)}
                  </td>
                  <td className="p-3">
                    {currency.format(invoice.paidAmount)}
                  </td>
                  <td className="p-3">
                    <Badge variant={statusVariant[invoice.status]}>{invoice.status}</Badge>
                    {invoice.balance > 0 ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {currency.format(invoice.balance)} remaining
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
