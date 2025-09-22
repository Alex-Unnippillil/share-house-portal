import { formatDistanceToNow } from 'date-fns'
import { ClipboardList, PackageOpen } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

import type { SupplyListEntry } from '../types'
import { MarkAcquiredButton } from './mark-acquired-button'

interface ShoppingListProps {
  items: SupplyListEntry[]
}

export function ShoppingList({ items }: ShoppingListProps) {
  if (!items.length) {
    return (
      <Card className="border-dashed">
        <CardHeader className="items-start gap-2">
          <ClipboardList className="size-10 text-muted-foreground" aria-hidden />
          <div>
            <CardTitle>No open errands</CardTitle>
            <CardDescription>
              Add items to the household shopping list so everyone knows what to pick up next.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {items.map(item => {
        const lastPurchase = item.lastPurchase ?? null
        const lastPurchaseTimestamp = lastPurchase?.purchasedAt ?? item.lastPurchasedAt
        const lastPurchaseLabel = lastPurchaseTimestamp
          ? `Last purchased ${formatDistanceToNow(new Date(lastPurchaseTimestamp), { addSuffix: true })}${
              lastPurchase?.purchaserName ? ` by ${lastPurchase.purchaserName}` : ''
            }`
          : 'No purchases logged yet'

        return (
          <Card key={item.id}>
            <CardHeader className="flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold">{item.name}</CardTitle>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {item.quantity ? (
                    <span>
                      <PackageOpen className="mr-1 inline-block size-4 align-middle" aria-hidden />
                      {item.quantity}
                    </span>
                  ) : null}
                  {item.category ? <Badge variant="secondary">{item.category}</Badge> : null}
                </div>
              </div>
              <MarkAcquiredButton itemId={item.id} itemName={item.name} />
            </CardHeader>
            {item.notes ? (
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.notes}</p>
              </CardContent>
            ) : null}
            <CardFooter className="flex flex-col items-start gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>{lastPurchaseLabel}</span>
              <span>Added {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
