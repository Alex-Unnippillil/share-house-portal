import type { AnalyticsEventType } from './types'

export const ANALYTICS_EVENT_LABELS: Record<AnalyticsEventType, string> = {
  rent_payment_submitted: 'Rent payments',
  rent_payment_failed: 'Payment issues',
  amenity_booking_created: 'Amenity bookings',
  document_signed: 'Documents signed',
  maintenance_request_filed: 'Maintenance tickets',
  message_posted: 'Message board posts',
}

export const ANALYTICS_EVENT_COLORS: Record<AnalyticsEventType, string> = {
  rent_payment_submitted: 'hsl(var(--primary))',
  rent_payment_failed: 'hsl(var(--destructive))',
  amenity_booking_created: 'hsl(var(--chart-2, 210 96% 72%))',
  document_signed: 'hsl(var(--chart-3, 145 70% 45%))',
  maintenance_request_filed: 'hsl(var(--chart-4, 31 97% 64%))',
  message_posted: 'hsl(var(--chart-5, 268 84% 60%))',
}

export const USAGE_TREND_EVENTS: AnalyticsEventType[] = [
  'rent_payment_submitted',
  'amenity_booking_created',
  'maintenance_request_filed',
]
