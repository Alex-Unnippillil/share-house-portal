import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import type { RentLedgerEntry, RentOverview } from '../actions'
import { formatCurrency, formatDate } from '../utils'

type RentSummaryCardProps = {
  lease: RentOverview['lease']
  outstandingTotal: number
  nextDueInvoice: RentLedgerEntry | null
}

export function RentSummaryCard({
  lease,
  outstandingTotal,
  nextDueInvoice,
}: RentSummaryCardProps) {
  if (!lease) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Lease overview</CardTitle>
          <CardDescription>Sign a lease to start tracking rent payments.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t find an active lease associated with your account. Please contact your property
            manager if you believe this is a mistake.
          </p>
        </CardContent>
      </Card>
    )
  }

  const property = lease.property
  const unit = lease.unit
  const monthlyRent = lease.rent_amount ? Number.parseFloat(lease.rent_amount) : null
  const currency = nextDueInvoice?.invoice.currency ?? 'usd'
  const formattedMonthlyRent =
    typeof monthlyRent === 'number' && !Number.isNaN(monthlyRent)
      ? formatCurrency(monthlyRent, currency)
      : '—'

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Lease overview</CardTitle>
        <CardDescription>
          {property?.name ?? 'Your home'}
          {unit?.name ? ` • ${unit.name}` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Badge variant={lease.status === 'active' ? 'secondary' : 'outline'} className="capitalize">
            {lease.status}
          </Badge>
          <div className="space-y-1 text-sm text-muted-foreground">
            {property?.address_line1 ? <p>{property.address_line1}</p> : null}
            {property?.address_line2 ? <p>{property.address_line2}</p> : null}
            <p>
              {[property?.city, property?.state, property?.postal_code]
                .filter(Boolean)
                .join(', ')}
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Monthly rent</p>
            <p className="text-lg font-semibold">{formattedMonthlyRent}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Outstanding balance</p>
            <p className="text-lg font-semibold">{formatCurrency(outstandingTotal, currency)}</p>
          </div>
          {nextDueInvoice ? (
            <div>
              <p className="text-sm text-muted-foreground">Next due</p>
              <p className="text-lg font-semibold">
                {formatDate(nextDueInvoice.invoice.due_date)} • {formatCurrency(nextDueInvoice.balance, currency)}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground">Next due</p>
              <p className="text-lg font-semibold">No upcoming charges</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <div>
          <span className="font-medium text-foreground">Lease period:</span>{' '}
          {formatDate(lease.start_date)} – {formatDate(lease.end_date, 'Open ended')}
        </div>
        {unit?.bedrooms || unit?.bathrooms ? (
          <div className="flex items-center gap-2 text-foreground">
            {unit?.bedrooms ? <span>{unit.bedrooms} bd</span> : null}
            {unit?.bathrooms ? <span>{unit.bathrooms} ba</span> : null}
          </div>
        ) : null}
      </CardFooter>
    </Card>
  )
}
