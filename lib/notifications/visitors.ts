import { format, parseISO } from 'date-fns'
import { Resend } from 'resend'

import type { ProfileSummary } from '@/types/visitors'
import type { VisitorNotificationPayload } from '@/app/dashboard/visitors/actions/shared'

function gatherRecipients(payload: VisitorNotificationPayload): string[] {
  const recipients = new Set<string>()

  const add = (profiles: ProfileSummary[]) => {
    for (const profile of profiles) {
      const email = profile.email?.trim()
      if (email) {
        recipients.add(email)
      }
    }
  }

  switch (payload.event) {
    case 'request_submitted':
      add(payload.roommates)
      add(payload.managers)
      break
    case 'request_cancelled':
      add(payload.roommates)
      add(payload.managers)
      break
    case 'status_changed':
      add(payload.roommates)
      add(payload.managers)
      if (payload.host.email) {
        recipients.add(payload.host.email)
      }
      break
    default:
      break
  }

  return Array.from(recipients)
}

function safeFormatDate(value: string): string {
  try {
    return format(parseISO(value), 'MMM d, yyyy')
  } catch {
    return value
  }
}

function buildMessage(payload: VisitorNotificationPayload) {
  const arrival = safeFormatDate(payload.log.arrival_date)
  const departure = safeFormatDate(payload.log.departure_date)
  const nights = payload.log.total_nights
  const visitorName = payload.log.visitor_name
  const hostName = payload.host.full_name ?? 'A roommate'
  const unitLabel = payload.host.unit_id ?? 'the unit'
  const ruleSummary = payload.rule
    ? `Max consecutive nights: ${payload.rule.max_consecutive_nights}. Requires manager approval: ${payload.rule.require_manager_approval ? 'Yes' : 'No'}.`
    : 'Refer to the published visitor policy for details.'

  if (payload.event === 'request_submitted') {
    return {
      subject: `Visitor request from ${hostName}`,
      text: [
        `${hostName} submitted a guest request for ${visitorName}.`,
        `Stay dates: ${arrival} to ${departure} (${nights} night${nights > 1 ? 's' : ''}).`,
        `Unit: ${unitLabel}.`,
        payload.log.reason ? `Reason: ${payload.log.reason}.` : null,
        ruleSummary,
        'Please review the request in the Share House Portal.',
      ]
        .filter(Boolean)
        .join('\n'),
    }
  }

  if (payload.event === 'request_cancelled') {
    return {
      subject: `Visitor stay cancelled by ${hostName}`,
      text: [
        `${hostName} cancelled the guest stay for ${visitorName}.`,
        `Originally scheduled for ${arrival} to ${departure} (${nights} night${nights > 1 ? 's' : ''}).`,
        payload.cancellationReason ? `Cancellation notes: ${payload.cancellationReason}.` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    }
  }

  const decisionText = payload.decision === 'approved' ? 'approved' : 'denied'
  const actorName = payload.actor?.full_name ?? 'A manager'

  return {
    subject: `Visitor request ${decisionText}: ${visitorName}`,
    text: [
      `${actorName} ${decisionText} the visit requested by ${hostName}.`,
      `Dates: ${arrival} to ${departure} (${nights} night${nights > 1 ? 's' : ''}).`,
      payload.log.approval_notes ? `Notes: ${payload.log.approval_notes}.` : null,
    ]
      .filter(Boolean)
      .join('\n'),
  }
}

export async function sendVisitorNotifications(
  payload: VisitorNotificationPayload,
): Promise<void> {
  const recipients = gatherRecipients(payload)
  if (!recipients.length) {
    return
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY is not configured; skipping visitor notifications.')
    return
  }

  const resend = new Resend(resendApiKey)
  const fromAddress =
    process.env.RESEND_VISITOR_FROM ?? 'Onyx Visitors <visitors@resend.dev>'

  const { subject, text } = buildMessage(payload)

  const { error } = await resend.emails.send({
    from: fromAddress,
    to: recipients,
    subject,
    text,
  })

  if (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(message)
  }
}
