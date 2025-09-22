import { Resend } from "resend"

import type { LandlordNotifier } from "./service"
import type { Incident, IncidentUpdate } from "./types"

function buildTextBody(incident: Incident, update: IncidentUpdate) {
  const lines = [
    `Incident: ${incident.title}`,
    `Household: ${incident.household_id}`,
    `Severity: ${incident.severity}`,
    `Status: ${incident.status}`,
    `Latest update: ${update.message}`,
    `Recorded at: ${new Date(update.created_at).toISOString()}`,
    "",
    `Description: ${incident.description}`,
  ]

  return lines.join("\n")
}

function buildHtmlBody(incident: Incident, update: IncidentUpdate) {
  return `<!doctype html>
<html>
  <body>
    <h1>Critical household incident</h1>
    <p><strong>Incident:</strong> ${incident.title}</p>
    <p><strong>Household:</strong> ${incident.household_id}</p>
    <p><strong>Severity:</strong> ${incident.severity}</p>
    <p><strong>Status:</strong> ${incident.status}</p>
    <p><strong>Latest update:</strong> ${update.message}</p>
    <p><strong>Recorded at:</strong> ${new Date(update.created_at).toLocaleString()}</p>
    <hr />
    <p>${incident.description}</p>
  </body>
</html>`
}

const DEFAULT_SENDER = "Share House Alerts <alerts@resend.dev>"

export function createResendLandlordNotifier(): LandlordNotifier {
  const apiKey = process.env.RESEND_API_KEY
  const landlordEmail = process.env.LANDLORD_ALERT_EMAIL
  const fromAddress = process.env.RESEND_ALERTS_FROM ?? DEFAULT_SENDER

  if (!apiKey || !landlordEmail) {
    return {
      async notifyCriticalIncident() {
        console.warn(
          "Skipping landlord notification because RESEND_API_KEY or LANDLORD_ALERT_EMAIL is not configured.",
        )
      },
    }
  }

  const resend = new Resend(apiKey)

  return {
    async notifyCriticalIncident({ incident, update }) {
      try {
        await resend.emails.send({
          from: fromAddress,
          to: [landlordEmail],
          subject: `[Critical Incident] ${incident.title}`,
          text: buildTextBody(incident, update),
          html: buildHtmlBody(incident, update),
        })
      } catch (error) {
        console.error("Failed to send landlord escalation", error)
      }
    },
  }
}

export const noopLandlordNotifier: LandlordNotifier = {
  async notifyCriticalIncident() {
    // intentional noop for tests
  },
}
