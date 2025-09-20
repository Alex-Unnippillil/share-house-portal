import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Database } from '@/lib/supabase'

import { formatCurrency, formatDate } from '../utils'

type RentPaymentRow = Database['public']['Tables']['rent_payments']['Row']

type PaymentHistoryProps = {
  payments: RentPaymentRow[]
}

export function PaymentHistory({ payments }: PaymentHistoryProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Payment history</CardTitle>
        <CardDescription>Track completed and pending transactions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Once you start paying rent online, your recent transactions will appear here.
          </p>
        ) : (
          <ul className="space-y-4">
            {payments.map((payment) => {
              const currency = payment.currency ?? 'usd'
              const statusVariant: 'complete' | 'secondary' | 'destructive' =
                payment.status === 'succeeded'
                  ? 'complete'
                  : payment.status === 'failed'
                    ? 'destructive'
                    : 'secondary'

              return (
                <li key={payment.id} className="flex items-start justify-between gap-4 border-b pb-4 last:border-b-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      {formatCurrency(Number.parseFloat(payment.amount ?? '0'), currency)}
                      <Badge variant={statusVariant} className="uppercase">
                        {payment.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(payment.processed_at ?? payment.created_at)} • {payment.payment_provider}
                    </p>
                    {payment.provider_payment_id ? (
                      <p className="text-xs text-muted-foreground">
                        Confirmation: {payment.provider_payment_id}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {payment.invoice_id ? <p>Invoice {payment.invoice_id.slice(0, 8)}…</p> : <p>Manual payment</p>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
