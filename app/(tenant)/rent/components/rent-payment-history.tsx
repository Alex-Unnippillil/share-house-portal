import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import type { RentLedgerPayment } from "../actions"

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

type RentPaymentHistoryProps = {
  payments: RentLedgerPayment[]
}

const statusVariant: Record<RentLedgerPayment["status"], "default" | "secondary" | "destructive" | "complete" | "outline"> = {
  pending: "secondary",
  succeeded: "complete",
  failed: "destructive",
  refunded: "outline",
}

export function RentPaymentHistory({ payments }: RentPaymentHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment history</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[520px] table-fixed text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Processed</th>
              <th className="px-3 py-2 font-medium">Provider</th>
              <th className="px-3 py-2 font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={4}>
                  No payments recorded yet. Start a checkout session to make your first payment.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="border-t">
                  <td className="p-3">
                    {dateFormatter.format(new Date(payment.processedAt ?? payment.createdAt))}
                  </td>
                  <td className="p-3 capitalize">{payment.provider}</td>
                  <td className="p-3 font-medium">
                    {currency.format(payment.amount)}
                  </td>
                  <td className="p-3">
                    <Badge variant={statusVariant[payment.status]}>{payment.status}</Badge>
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
