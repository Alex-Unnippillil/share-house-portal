import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

import { getNextRentSummary } from '../data'

export async function RentSummaryCard() {
  const summary = await getNextRentSummary()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Next rent due</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">Amount</div>
        <div className="text-2xl font-semibold">{summary.amount}</div>
        <div className="mt-1 text-sm text-muted-foreground">{summary.dueOn}</div>
        <Link href="/payments" className="mt-4 inline-block">
          <Button size="sm">{summary.autopayEnabled ? 'Manage autopay' : 'View details'}</Button>
        </Link>
      </CardContent>
    </Card>
  )
}
