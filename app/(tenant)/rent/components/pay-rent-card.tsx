import { format } from 'date-fns'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { formatCurrency } from '../utils'
import { PayRentButton } from './pay-rent-button'

type PayRentCardProps = {
  outstandingTotal: number
  currency: string
  invoiceIds: string[]
  nextDueDate?: string | null
}

export function PayRentCard({
  outstandingTotal,
  currency,
  invoiceIds,
  nextDueDate,
}: PayRentCardProps) {
  const hasBalance = outstandingTotal > 0 && invoiceIds.length > 0
  const formattedBalance = formatCurrency(outstandingTotal, currency)
  const nextDueLabel = nextDueDate ? format(new Date(nextDueDate), 'PPP') : 'No upcoming charges'

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          {hasBalance ? (
            <AlertCircle className="size-4 text-destructive" />
          ) : (
            <CheckCircle2 className="size-4 text-emerald-500" />
          )}
          Pay rent
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Outstanding balance</p>
          <p className="text-2xl font-semibold">{formattedBalance}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Next due date</p>
          <Badge variant={hasBalance ? 'destructive' : 'secondary'}>{nextDueLabel}</Badge>
        </div>
        <PayRentButton invoiceIds={invoiceIds} disabled={!hasBalance} />
      </CardContent>
    </Card>
  )
}
