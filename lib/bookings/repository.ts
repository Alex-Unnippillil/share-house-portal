import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase'

import type { BookingEventInput, BookingRecord, BookingWaitlistEntry } from './types'

export interface BookingRepository {
  findBookingsNeedingReminder(startWindow: Date, endWindow: Date): Promise<BookingRecord[]>
  markReminderSent(bookingId: string, timestamp: Date): Promise<void>
  logEvent(event: BookingEventInput): Promise<void>
  findBookingsNeedingNoShowProcessing(cutoff: Date): Promise<BookingRecord[]>
  cancelBookingForNoShow(bookingId: string, timestamp: Date): Promise<void>
  listWaitlistForBooking(bookingId: string): Promise<BookingWaitlistEntry[]>
  markWaitlistEntryNotified(entryId: string, timestamp: Date): Promise<void>
  getBookingById(bookingId: string): Promise<BookingRecord | null>
  markCheckedIn(bookingId: string, timestamp: Date): Promise<void>
}

export class SupabaseBookingRepository implements BookingRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async findBookingsNeedingReminder(startWindow: Date, endWindow: Date) {
    const { data, error } = await this.client
      .from('bookings')
      .select('*')
      .eq('status', 'confirmed')
      .is('reminder_sent_at', null)
      .gte('start_time', startWindow.toISOString())
      .lt('start_time', endWindow.toISOString())
      .order('start_time', { ascending: true })

    if (error) {
      throw new Error(`Failed to load bookings for reminders: ${error.message}`)
    }

    return data ?? []
  }

  async markReminderSent(bookingId: string, timestamp: Date) {
    const { error } = await this.client
      .from('bookings')
      .update({
        reminder_sent_at: timestamp.toISOString(),
        updated_at: timestamp.toISOString(),
      })
      .eq('id', bookingId)

    if (error) {
      throw new Error(`Failed to mark reminder as sent: ${error.message}`)
    }
  }

  async logEvent(event: BookingEventInput) {
    const { error } = await this.client.from('events').insert({
      booking_id: event.bookingId,
      member_id: event.memberId,
      event_type: event.eventType,
      metadata: event.metadata ?? null,
    })

    if (error) {
      throw new Error(`Failed to log booking event: ${error.message}`)
    }
  }

  async findBookingsNeedingNoShowProcessing(cutoff: Date) {
    const { data, error } = await this.client
      .from('bookings')
      .select('*')
      .eq('status', 'confirmed')
      .is('check_in_at', null)
      .is('no_show_processed_at', null)
      .lte('start_time', cutoff.toISOString())
      .order('start_time', { ascending: true })

    if (error) {
      throw new Error(`Failed to load bookings for no-show processing: ${error.message}`)
    }

    return data ?? []
  }

  async cancelBookingForNoShow(bookingId: string, timestamp: Date) {
    const iso = timestamp.toISOString()
    const { error } = await this.client
      .from('bookings')
      .update({
        status: 'no_show_cancelled',
        cancelled_at: iso,
        no_show_processed_at: iso,
        updated_at: iso,
      })
      .eq('id', bookingId)

    if (error) {
      throw new Error(`Failed to cancel booking: ${error.message}`)
    }
  }

  async listWaitlistForBooking(bookingId: string) {
    const { data, error } = await this.client
      .from('booking_waitlist_entries')
      .select('*')
      .eq('booking_id', bookingId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to load waitlist entries: ${error.message}`)
    }

    return data ?? []
  }

  async markWaitlistEntryNotified(entryId: string, timestamp: Date) {
    const { error } = await this.client
      .from('booking_waitlist_entries')
      .update({ notified_at: timestamp.toISOString() })
      .eq('id', entryId)

    if (error) {
      throw new Error(`Failed to mark waitlist entry as notified: ${error.message}`)
    }
  }

  async getBookingById(bookingId: string) {
    const { data, error } = await this.client
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to load booking: ${error.message}`)
    }

    return data ?? null
  }

  async markCheckedIn(bookingId: string, timestamp: Date) {
    const iso = timestamp.toISOString()
    const { error } = await this.client
      .from('bookings')
      .update({
        status: 'checked_in',
        check_in_at: iso,
        updated_at: iso,
      })
      .eq('id', bookingId)

    if (error) {
      throw new Error(`Failed to record check-in: ${error.message}`)
    }
  }
}
