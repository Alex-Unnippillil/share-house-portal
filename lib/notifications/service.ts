import { Resend } from 'resend'

import type { BookingRecord, BookingWaitlistEntry } from '@/lib/bookings/types'

export interface BookingReminderPayload {
  booking: BookingRecord
  startTime: Date
  reminderTime: Date
  leadTimeMinutes: number
}

export interface BookingCancellationPayload {
  booking: BookingRecord
  startTime: Date
  cancellationTime: Date
  gracePeriodMinutes: number
}

export interface WaitlistPromotionPayload {
  booking: BookingRecord
  startTime: Date
  waitlistEntry: BookingWaitlistEntry
  notificationTime: Date
}

export interface BookingNotificationService {
  sendReminder(payload: BookingReminderPayload): Promise<void>
  sendNoShowCancellation(payload: BookingCancellationPayload): Promise<void>
  sendWaitlistPromotion(payload: WaitlistPromotionPayload): Promise<void>
}

class ResendBookingNotificationService implements BookingNotificationService {
  constructor(private readonly resend: Resend, private readonly fromAddress: string) {}

  async sendReminder(payload: BookingReminderPayload) {
    const { booking, startTime, leadTimeMinutes } = payload
    const subject = `Reminder: ${describeAmenity(booking)} at ${formatDateTime(startTime)}`
    const salutation = booking.member_name ? `Hi ${booking.member_name},` : 'Hi there,'
    const bodyLines = [
      salutation,
      '',
      `This is a friendly reminder that your booking for ${describeAmenity(booking)} starts in about ${leadTimeMinutes} minutes at ${formatDateTime(startTime)}.`,
      'Please make sure you arrive on time and check in so roommates know the space is in use.',
      '',
      'Thanks for keeping the schedule coordinated!'
    ]

    await this.sendEmail({ to: booking.member_email, subject, bodyLines })
  }

  async sendNoShowCancellation(payload: BookingCancellationPayload) {
    const { booking, startTime, cancellationTime, gracePeriodMinutes } = payload
    const subject = `Booking cancelled due to missed check-in: ${describeAmenity(booking)}`
    const salutation = booking.member_name ? `Hi ${booking.member_name},` : 'Hi there,'
    const bodyLines = [
      salutation,
      '',
      `We didn't receive a check-in for your ${describeAmenity(booking)} reservation that started at ${formatDateTime(startTime)}.`,
      `After waiting ${gracePeriodMinutes} minutes, the booking was cancelled at ${formatDateTime(cancellationTime)} so others can claim the slot.`,
      '',
      'If you still need time in the space, please create a new booking.',
    ]

    await this.sendEmail({ to: booking.member_email, subject, bodyLines })
  }

  async sendWaitlistPromotion(payload: WaitlistPromotionPayload) {
    const { booking, waitlistEntry, startTime, notificationTime } = payload
    const subject = `Spot available: ${describeAmenity(booking)} at ${formatDateTime(startTime)}`
    const salutation = waitlistEntry.member_name ? `Hi ${waitlistEntry.member_name},` : 'Hi there,'
    const bodyLines = [
      salutation,
      '',
      `Good news! A spot just opened for ${describeAmenity(booking)} starting at ${formatDateTime(startTime)}.`,
      `You're next on the waitlist, so feel free to confirm the booking or claim the time in the portal.`,
      '',
      `Notification sent at ${formatDateTime(notificationTime)}.`,
    ]

    await this.sendEmail({ to: waitlistEntry.member_email, subject, bodyLines })
  }

  private async sendEmail({
    to,
    subject,
    bodyLines,
  }: {
    to: string
    subject: string
    bodyLines: string[]
  }) {
    const { error } = await this.resend.emails.send({
      from: this.fromAddress,
      to: [to],
      subject,
      text: bodyLines.join('\n'),
    })

    if (error) {
      throw error instanceof Error ? error : new Error(String(error))
    }
  }
}

export function createBookingNotificationService(): BookingNotificationService {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  const from = process.env.BOOKING_NOTIFICATIONS_FROM ?? 'Share House Portal <bookings@resend.dev>'
  const resend = new Resend(apiKey)
  return new ResendBookingNotificationService(resend, from)
}

function describeAmenity(booking: BookingRecord) {
  return booking.amenity_name ?? 'shared amenity'
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value)
}
