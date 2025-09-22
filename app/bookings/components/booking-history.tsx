import { format, parseISO } from 'date-fns'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import type { BookingHistoryItem } from '../loaders'

function formatTimeslot(item: BookingHistoryItem): string {
  const start = parseISO(item.startTime)
  const end = parseISO(item.endTime)
  return `${format(start, 'EEE MMM d')} · ${format(start, 'p')}–${format(end, 'p')}`
}

interface BookingHistoryProps {
  items: BookingHistoryItem[]
}

export function BookingHistory({ items }: BookingHistoryProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">No bookings logged yet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Book an amenity to see recent reservations appear here. We surface the last
            six bookings captured via Supabase to keep everyone aligned.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{item.amenityName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{formatTimeslot(item)}</p>
            <p className="capitalize">Status · {item.status}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
