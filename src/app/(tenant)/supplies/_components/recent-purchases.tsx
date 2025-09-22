import { format, formatDistanceToNow } from 'date-fns'
import { Receipt, Wallet } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

import type { SupplyPurchase } from '../types'

interface RecentPurchasesProps {
  purchases: SupplyPurchase[]
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

export function RecentPurchases({ purchases }: RecentPurchasesProps) {
  if (!purchases.length) {
    return (
      <Card className="border-dashed">
        <CardHeader className="items-start gap-2">
          <Receipt className="size-10 text-muted-foreground" aria-hidden />
          <div>
            <CardTitle>No purchases logged yet</CardTitle>
            <CardDescription>
              Once roommates mark items as acquired you will see the purchase history here.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {purchases.map(purchase => {
        const costLabel =
          typeof purchase.totalCost === 'number' && !Number.isNaN(purchase.totalCost)
            ? currencyFormatter.format(purchase.totalCost)
            : null

        return (
          <Card key={purchase.id}>
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold">{purchase.itemName}</CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-2 text-sm">
                  <span>
                    Purchased {formatDistanceToNow(new Date(purchase.purchasedAt), { addSuffix: true })}
                  </span>
                  {purchase.purchaserName ? <Badge variant="outline">{purchase.purchaserName}</Badge> : null}
                  {purchase.quantity ? <Badge variant="secondary">{purchase.quantity}</Badge> : null}
                </CardDescription>
              </div>
              {costLabel ? (
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Wallet className="size-4 text-muted-foreground" aria-hidden />
                  {costLabel}
                </div>
              ) : null}
            </CardHeader>
            {purchase.notes ? (
              <CardContent>
                <p className="text-sm text-muted-foreground">{purchase.notes}</p>
              </CardContent>
            ) : null}
            <CardFooter className="pt-0 text-xs text-muted-foreground">
              Logged on {format(new Date(purchase.purchasedAt), 'MMM d, yyyy h:mm a')}
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
