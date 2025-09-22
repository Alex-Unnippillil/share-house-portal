import type { BookingNotificationService } from '@/lib/notifications/service'

import type { BookingRepository } from './repository'
import type { BookingRecord, BookingWaitlistEntry, JsonMap } from './types'

const MINUTE_IN_MS = 60_000
const DEFAULT_REMINDER_LEAD_MINUTES = 60
const DEFAULT_REMINDER_WINDOW_MINUTES = 15
const DEFAULT_NO_SHOW_GRACE_MINUTES = 15

export interface JobError {
  bookingId: string | null
  stage: string
  message: string
  targetId?: string | null
}

export interface ReminderJobOptions {
  now?: Date
  leadTimeMinutes?: number
  windowMinutes?: number
}

export interface ReminderJobResult {
  considered: number
  remindersSent: number
  errors: JobError[]
}

export interface NoShowJobOptions {
  now?: Date
  gracePeriodMinutes?: number
}

export interface NoShowJobResult {
  considered: number
  cancellations: number
  waitlistNotifications: number
  errors: JobError[]
}

export async function processBookingReminders(
  repository: BookingRepository,
  notifications: BookingNotificationService,
  options: ReminderJobOptions = {},
): Promise<ReminderJobResult> {
  const now = options.now ?? new Date()
  const leadMinutes = options.leadTimeMinutes ?? DEFAULT_REMINDER_LEAD_MINUTES
  const windowMinutes = options.windowMinutes ?? DEFAULT_REMINDER_WINDOW_MINUTES

  const reminderWindowStart = new Date(now.getTime() + leadMinutes * MINUTE_IN_MS)
  const reminderWindowEnd = new Date(reminderWindowStart.getTime() + windowMinutes * MINUTE_IN_MS)

  const errors: JobError[] = []
  let remindersSent = 0

  let bookings: BookingRecord[] = []
  try {
    bookings = await repository.findBookingsNeedingReminder(reminderWindowStart, reminderWindowEnd)
  } catch (error) {
    addError(errors, null, 'load_reminders', error)
    return {
      considered: 0,
      remindersSent: 0,
      errors,
    }
  }

  for (const booking of bookings) {
    const startTime = new Date(booking.start_time)

    try {
      await notifications.sendReminder({
        booking,
        startTime,
        reminderTime: now,
        leadTimeMinutes: leadMinutes,
      })
      remindersSent += 1
    } catch (error) {
      addError(errors, booking.id, 'send_reminder', error)
      continue
    }

    try {
      await repository.markReminderSent(booking.id, now)
    } catch (error) {
      addError(errors, booking.id, 'update_reminder', error)
    }

    try {
      await repository.logEvent({
        bookingId: booking.id,
        memberId: booking.member_id,
        eventType: 'booking.reminder_sent',
        metadata: reminderMetadata(booking, now, leadMinutes),
      })
    } catch (error) {
      addError(errors, booking.id, 'log_reminder_event', error)
    }
  }

  return {
    considered: bookings.length,
    remindersSent,
    errors,
  }
}

export async function processBookingNoShows(
  repository: BookingRepository,
  notifications: BookingNotificationService,
  options: NoShowJobOptions = {},
): Promise<NoShowJobResult> {
  const now = options.now ?? new Date()
  const graceMinutes = options.gracePeriodMinutes ?? DEFAULT_NO_SHOW_GRACE_MINUTES
  const cutoff = new Date(now.getTime() - graceMinutes * MINUTE_IN_MS)

  const errors: JobError[] = []
  let cancellations = 0
  let waitlistNotifications = 0

  let bookings: BookingRecord[] = []
  try {
    bookings = await repository.findBookingsNeedingNoShowProcessing(cutoff)
  } catch (error) {
    addError(errors, null, 'load_no_shows', error)
    return {
      considered: 0,
      cancellations: 0,
      waitlistNotifications: 0,
      errors,
    }
  }

  for (const booking of bookings) {
    const startTime = new Date(booking.start_time)

    try {
      await repository.cancelBookingForNoShow(booking.id, now)
      cancellations += 1
    } catch (error) {
      addError(errors, booking.id, 'cancel_no_show', error)
      continue
    }

    try {
      await notifications.sendNoShowCancellation({
        booking,
        startTime,
        cancellationTime: now,
        gracePeriodMinutes: graceMinutes,
      })
    } catch (error) {
      addError(errors, booking.id, 'send_no_show_cancellation', error)
    }

    try {
      await repository.logEvent({
        bookingId: booking.id,
        memberId: booking.member_id,
        eventType: 'booking.no_show_cancelled',
        metadata: noShowMetadata(booking, now, graceMinutes),
      })
    } catch (error) {
      addError(errors, booking.id, 'log_no_show_event', error)
    }

    let waitlist: BookingWaitlistEntry[] = []
    try {
      waitlist = await repository.listWaitlistForBooking(booking.id)
    } catch (error) {
      addError(errors, booking.id, 'load_waitlist', error)
      continue
    }

    for (const entry of waitlist) {
      try {
        await notifications.sendWaitlistPromotion({
          booking,
          startTime,
          waitlistEntry: entry,
          notificationTime: now,
        })
        waitlistNotifications += 1
      } catch (error) {
        addError(errors, booking.id, 'send_waitlist_notification', error, entry.id)
        continue
      }

      try {
        await repository.markWaitlistEntryNotified(entry.id, now)
      } catch (error) {
        addError(errors, booking.id, 'update_waitlist_entry', error, entry.id)
      }

      try {
        await repository.logEvent({
          bookingId: booking.id,
          memberId: entry.member_id,
          eventType: 'booking.waitlist_notified',
          metadata: waitlistMetadata(entry, now),
        })
      } catch (error) {
        addError(errors, booking.id, 'log_waitlist_event', error, entry.id)
      }
    }
  }

  return {
    considered: bookings.length,
    cancellations,
    waitlistNotifications,
    errors,
  }
}

function reminderMetadata(booking: BookingRecord, reminderTime: Date, leadMinutes: number): JsonMap {
  return {
    reminder_sent_at: reminderTime.toISOString(),
    start_time: booking.start_time,
    lead_minutes: leadMinutes,
    member_email: booking.member_email,
  }
}

function noShowMetadata(booking: BookingRecord, timestamp: Date, graceMinutes: number): JsonMap {
  return {
    cancelled_at: timestamp.toISOString(),
    reason: 'no_show',
    start_time: booking.start_time,
    member_email: booking.member_email,
    grace_minutes: graceMinutes,
  }
}

function waitlistMetadata(entry: BookingWaitlistEntry, timestamp: Date): JsonMap {
  return {
    notified_at: timestamp.toISOString(),
    waitlist_entry_id: entry.id,
    waitlist_member_id: entry.member_id,
    waitlist_member_email: entry.member_email,
    position: entry.position,
  }
}

function addError(errors: JobError[], bookingId: string | null, stage: string, cause: unknown, targetId?: string | null) {
  const message = cause instanceof Error ? cause.message : String(cause)
  errors.push({
    bookingId,
    stage,
    message,
    targetId: targetId ?? null,
  })
}
