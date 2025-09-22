import type { Database, Json } from '@/lib/supabase'

export type BookingRecord = Database['public']['Tables']['bookings']['Row']
export type BookingWaitlistEntry = Database['public']['Tables']['booking_waitlist_entries']['Row']
export type BookingStatus = BookingRecord['status']

export type JsonMap = { [key: string]: Json }

export interface BookingEventInput {
  bookingId: string | null
  memberId: string | null
  eventType: string
  metadata?: JsonMap
}

export type CheckInMethod = 'button' | 'presence'
