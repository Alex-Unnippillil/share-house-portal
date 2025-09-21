import { Resend } from 'resend'

import type { PackageRow } from './types'

export interface IntakeNotificationPayload {
  package: PackageRow
  recipientEmail: string
  recipientName?: string
}

export interface PickupNotificationPayload {
  package: PackageRow
  recipientEmail?: string
  recipientName?: string
  pickedUpBy: string
  pickedUpAt: string
}

export interface ReminderNotificationPayload {
  package: PackageRow
  recipientEmail: string
  message?: string
}

export interface NotificationProvider {
  sendIntakeNotification(payload: IntakeNotificationPayload): Promise<void>
  sendPickupNotification(payload: PickupNotificationPayload): Promise<void>
  sendReminderNotification(payload: ReminderNotificationPayload): Promise<void>
}

function buildResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  return apiKey ? new Resend(apiKey) : null
}

function getSenderEmail() {
  return process.env.PACKAGE_NOTIFICATIONS_FROM ?? 'Packages <no-reply@sharehouse.local>'
}

export function createNotificationProvider(): NotificationProvider | null {
  const resend = buildResendClient()
  if (!resend) {
    return null
  }

  const from = getSenderEmail()

  return {
    async sendIntakeNotification({ package: pkg, recipientEmail, recipientName }) {
      await resend.emails.send({
        from,
        to: [recipientEmail],
        subject: `Package received: ${pkg.name}`,
        text: `Hello${recipientName ? ` ${recipientName}` : ''},\n\nYour package "${pkg.name}" is ready for pickup. Please bring a valid ID and this barcode: ${pkg.id}.`,
      })
    },
    async sendPickupNotification({
      package: pkg,
      recipientEmail,
      recipientName,
      pickedUpBy,
      pickedUpAt,
    }) {
      if (!recipientEmail) {
        return
      }

      await resend.emails.send({
        from,
        to: [recipientEmail],
        subject: `Package picked up: ${pkg.name}`,
        text: `Hello${recipientName ? ` ${recipientName}` : ''},\n\nThis is a confirmation that "${pkg.name}" was picked up by ${pickedUpBy} on ${new Date(
          pickedUpAt
        ).toLocaleString()}.`,
      })
    },
    async sendReminderNotification({ package: pkg, recipientEmail, message }) {
      await resend.emails.send({
        from,
        to: [recipientEmail],
        subject: `Pickup reminder: ${pkg.name}`,
        text:
          message ??
          `Hello,\n\nThis is a friendly reminder to pick up your package "${pkg.name}" at your earliest convenience.`,
      })
    },
  }
}
