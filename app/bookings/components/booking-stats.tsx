import { format, parseISO } from 'date-fns'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import type { BookingMetrics } from '../loaders'

type BookingStatsProps = {
  metrics: BookingMetrics
  totalAmenities: number
  range: { start: string; end: string }
}

function formatRange(range: { start: string; end: string }): string {
  const start = parseISO(range.start)
  const end = parseISO(range.end)
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`
}

export function BookingStats({ metrics, totalAmenities, range }: BookingStatsProps) {
  const stats = [
    {
      title: 'Open slots next 7 days',
      value: metrics.totalAvailableSlots.toString(),
      description: `${metrics.amenitiesWithAvailability}/${totalAmenities} amenities reporting availability`,
    },
    {
      title: 'First available slot',
      value: metrics.firstAvailableSlot
        ? format(parseISO(metrics.firstAvailableSlot), 'EEE MMM d · p')
        : 'No availability',
      description: `Window ${formatRange(range)}`,
    },
    {
      title: 'Peak-hour coverage',
      value: `${metrics.peakSlotShare.toFixed(1)}%`,
      description: 'Slots between 5–9pm local time',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="space-y-1">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <CardDescription>{stat.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
