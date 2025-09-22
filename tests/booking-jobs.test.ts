import { describe, expect, it } from 'vitest'

import {
  processBookingNoShows,
  processBookingReminders,
  type BookingRepository,
} from '@/lib/bookings'
import type {
  BookingCancellationPayload,
  BookingNotificationService,
  BookingReminderPayload,
  WaitlistPromotionPayload,
} from '@/lib/notifications/service'
import type { BookingEventInput, BookingRecord, BookingWaitlistEntry } from '@/lib/bookings/types'

const BASE_DATE = new Date('2024-07-10T10:00:00Z')

describe('booking automation jobs', () => {
  it('sends reminders for bookings within the reminder window and logs events', async () => {
    const repository = new InMemoryBookingRepository({
      bookings: [
        createBooking({
          id: 'booking-1',
          startOffsetMinutes: 65,
          memberEmail: 'alice@example.com',
        }),
        createBooking({
          id: 'booking-2',
          startOffsetMinutes: 120,
          memberEmail: 'bob@example.com',
        }),
        createBooking({
          id: 'booking-3',
          startOffsetMinutes: 70,
          reminder_sent_at: BASE_DATE.toISOString(),
          memberEmail: 'carol@example.com',
        }),
      ],
    })
    const notifications = new TestNotificationService()

    const result = await processBookingReminders(repository, notifications, {
      now: BASE_DATE,
      leadTimeMinutes: 60,
      windowMinutes: 15,
    })

    expect(result.considered).toBe(1)
    expect(result.remindersSent).toBe(1)
    expect(result.errors).toHaveLength(0)

    const updated = repository.findBooking('booking-1')
    expect(updated?.reminder_sent_at).toBe(BASE_DATE.toISOString())
    expect(notifications.reminders).toHaveLength(1)
    expect(repository.events).toContainEqual(
      expect.objectContaining({
        eventType: 'booking.reminder_sent',
        bookingId: 'booking-1',
      }),
    )
  })

  it('cancels no-show bookings, notifies waitlist, and records events', async () => {
    const repository = new InMemoryBookingRepository({
      bookings: [
        createBooking({
          id: 'booking-10',
          startOffsetMinutes: -30,
          memberEmail: 'dana@example.com',
        }),
      ],
      waitlist: [
        createWaitlistEntry({ id: 'wait-1', bookingId: 'booking-10', memberEmail: 'erin@example.com', position: 1 }),
        createWaitlistEntry({ id: 'wait-2', bookingId: 'booking-10', memberEmail: 'frank@example.com', position: 2 }),
      ],
    })
    const notifications = new TestNotificationService()

    const result = await processBookingNoShows(repository, notifications, {
      now: BASE_DATE,
      gracePeriodMinutes: 15,
    })

    expect(result.considered).toBe(1)
    expect(result.cancellations).toBe(1)
    expect(result.waitlistNotifications).toBe(2)
    expect(result.errors).toHaveLength(0)

    const booking = repository.findBooking('booking-10')
    expect(booking?.status).toBe('no_show_cancelled')
    expect(booking?.cancelled_at).toBe(BASE_DATE.toISOString())
    expect(booking?.no_show_processed_at).toBe(BASE_DATE.toISOString())

    expect(repository.waitlistEntries.map((entry) => entry.notified_at)).toEqual([
      BASE_DATE.toISOString(),
      BASE_DATE.toISOString(),
    ])

    expect(repository.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventType: 'booking.no_show_cancelled', bookingId: 'booking-10' }),
        expect.objectContaining({ eventType: 'booking.waitlist_notified', bookingId: 'booking-10' }),
      ]),
    )

    expect(notifications.waitlistPromotions).toHaveLength(2)
  })
})

class InMemoryBookingRepository implements BookingRepository {
  bookings: BookingRecord[]
  waitlistEntries: BookingWaitlistEntry[]
  events: BookingEventInput[]

  constructor(params: { bookings?: BookingRecord[]; waitlist?: BookingWaitlistEntry[] } = {}) {
    this.bookings = params.bookings ?? []
    this.waitlistEntries = params.waitlist ?? []
    this.events = []
  }

  findBooking(id: string) {
    return this.bookings.find((booking) => booking.id === id)
  }

  async findBookingsNeedingReminder(startWindow: Date, endWindow: Date) {
    return this.bookings.filter((booking) => {
      if (booking.status !== 'confirmed' || booking.reminder_sent_at) {
        return false
      }

      const startTime = new Date(booking.start_time).getTime()
      return startTime >= startWindow.getTime() && startTime < endWindow.getTime()
    })
  }

  async markReminderSent(bookingId: string, timestamp: Date) {
    const booking = this.findBooking(bookingId)
    if (booking) {
      booking.reminder_sent_at = timestamp.toISOString()
      booking.updated_at = timestamp.toISOString()
    }
  }

  async logEvent(event: BookingEventInput) {
    this.events.push(event)
  }

  async findBookingsNeedingNoShowProcessing(cutoff: Date) {
    return this.bookings.filter((booking) => {
      if (booking.status !== 'confirmed' || booking.check_in_at || booking.no_show_processed_at) {
        return false
      }

      const startTime = new Date(booking.start_time).getTime()
      return startTime <= cutoff.getTime()
    })
  }

  async cancelBookingForNoShow(bookingId: string, timestamp: Date) {
    const booking = this.findBooking(bookingId)
    if (booking) {
      const iso = timestamp.toISOString()
      booking.status = 'no_show_cancelled'
      booking.cancelled_at = iso
      booking.no_show_processed_at = iso
      booking.updated_at = iso
    }
  }

  async listWaitlistForBooking(bookingId: string) {
    return this.waitlistEntries
      .filter((entry) => entry.booking_id === bookingId)
      .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
  }

  async markWaitlistEntryNotified(entryId: string, timestamp: Date) {
    const entry = this.waitlistEntries.find((item) => item.id === entryId)
    if (entry) {
      entry.notified_at = timestamp.toISOString()
    }
  }

  async getBookingById(bookingId: string) {
    return this.findBooking(bookingId) ?? null
  }

  async markCheckedIn(bookingId: string, timestamp: Date) {
    const booking = this.findBooking(bookingId)
    if (booking) {
      const iso = timestamp.toISOString()
      booking.status = 'checked_in'
      booking.check_in_at = iso
      booking.updated_at = iso
    }
  }
}

class TestNotificationService implements BookingNotificationService {
  reminders: BookingReminderPayload[] = []
  cancellations: BookingCancellationPayload[] = []
  waitlistPromotions: WaitlistPromotionPayload[] = []

  async sendReminder(payload: BookingReminderPayload) {
    this.reminders.push(payload)
  }

  async sendNoShowCancellation(payload: BookingCancellationPayload) {
    this.cancellations.push(payload)
  }

  async sendWaitlistPromotion(payload: WaitlistPromotionPayload) {
    this.waitlistPromotions.push(payload)
  }
}

function createBooking(options: {
  id: string
  startOffsetMinutes: number
  memberEmail: string
  reminder_sent_at?: string | null
}): BookingRecord {
  const start = new Date(BASE_DATE.getTime() + options.startOffsetMinutes * 60_000)
  return {
    id: options.id,
    amenity_id: null,
    amenity_name: 'Test amenity',
    cancelled_at: null,
    check_in_at: null,
    created_at: BASE_DATE.toISOString(),
    end_time: new Date(start.getTime() + 60 * 60_000).toISOString(),
    member_email: options.memberEmail,
    member_id: `${options.id}-member`,
    member_name: 'Test Member',
    no_show_processed_at: null,
    reminder_sent_at: options.reminder_sent_at ?? null,
    start_time: start.toISOString(),
    status: 'confirmed',
    updated_at: BASE_DATE.toISOString(),
    waitlist_notified_at: null,
  }
}

function createWaitlistEntry(options: {
  id: string
  bookingId: string
  memberEmail: string
  position: number
}): BookingWaitlistEntry {
  return {
    id: options.id,
    booking_id: options.bookingId,
    member_id: `${options.id}-member`,
    member_email: options.memberEmail,
    member_name: 'Waitlist Member',
    position: options.position,
    notified_at: null,
    created_at: BASE_DATE.toISOString(),
  }
}
