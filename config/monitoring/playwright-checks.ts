export type AlertChannel =
  | { type: "pagerduty"; integrationKey: string; threshold: number }
  | { type: "slack"; channel: string; threshold: number }
  | { type: "email"; address: string; threshold: number }

export type SyntheticCheckDefinition = {
  id: string
  name: string
  description: string
  spec: string
  frequencyMinutes: number
  locations: string[]
  alertThreshold: {
    consecutiveFailures: number
    responseTimeMs: number
    recoveryCount: number
  }
  alertChannels: AlertChannel[]
  tags?: string[]
}

export type SyntheticMonitorSuite = {
  service: "checkly"
  project: string
  runtime: string
  playwrightConfig: string
  defaultLocations: string[]
  alertChannels: AlertChannel[]
  checks: SyntheticCheckDefinition[]
}

const defaultLocations = ["us-east-1", "us-west-2", "eu-central-1"]
const sharedAlertChannels: AlertChannel[] = [
  { type: "pagerduty", integrationKey: "roomsily-platform", threshold: 1 },
  { type: "slack", channel: "#alerts-synthetics", threshold: 1 },
]

export const syntheticMonitorSuite: SyntheticMonitorSuite = {
  service: "checkly",
  project: "roomsily-portal",
  runtime: "2024.10",
  playwrightConfig: "../../playwright.config.ts",
  defaultLocations,
  alertChannels: sharedAlertChannels,
  checks: [
    {
      id: "onboarding-flow",
      name: "Tenant onboarding",
      description: "Validates that new roommates can access the onboarding flow and prepare registration data.",
      spec: "tests/e2e/onboarding.spec.ts",
      frequencyMinutes: 5,
      locations: defaultLocations,
      tags: ["journey:onboarding", "feature:auth"],
      alertThreshold: {
        consecutiveFailures: 2,
        responseTimeMs: 8000,
        recoveryCount: 2,
      },
      alertChannels: sharedAlertChannels,
    },
    {
      id: "payments-overview",
      name: "Payments workspace",
      description: "Confirms that rent balances render and Stripe helpers respond from the production API tier.",
      spec: "tests/e2e/payments.spec.ts",
      frequencyMinutes: 5,
      locations: defaultLocations,
      tags: ["journey:payments", "integration:stripe"],
      alertThreshold: {
        consecutiveFailures: 2,
        responseTimeMs: 10000,
        recoveryCount: 2,
      },
      alertChannels: sharedAlertChannels,
    },
    {
      id: "amenity-bookings",
      name: "Amenity bookings",
      description: "Exercises Cal.com powered scheduling to confirm conflict checks and history views stay responsive.",
      spec: "tests/e2e/bookings.spec.ts",
      frequencyMinutes: 5,
      locations: defaultLocations,
      tags: ["journey:bookings", "integration:calcom"],
      alertThreshold: {
        consecutiveFailures: 2,
        responseTimeMs: 10000,
        recoveryCount: 2,
      },
      alertChannels: sharedAlertChannels,
    },
    {
      id: "messaging-triage",
      name: "Messaging moderation",
      description: "Ensures the realtime messaging console loads and moderation controls remain actionable.",
      spec: "tests/e2e/messaging.spec.ts",
      frequencyMinutes: 10,
      locations: defaultLocations,
      tags: ["journey:messaging", "feature:moderation"],
      alertThreshold: {
        consecutiveFailures: 3,
        responseTimeMs: 9000,
        recoveryCount: 2,
      },
      alertChannels: sharedAlertChannels,
    },
    {
      id: "maintenance-requests",
      name: "Maintenance intake",
      description: "Verifies that residents can submit a maintenance request and receive confirmation messaging.",
      spec: "tests/e2e/maintenance.spec.ts",
      frequencyMinutes: 10,
      locations: defaultLocations,
      tags: ["journey:maintenance", "integration:supabase"],
      alertThreshold: {
        consecutiveFailures: 2,
        responseTimeMs: 12000,
        recoveryCount: 2,
      },
      alertChannels: sharedAlertChannels,
    },
  ],
}

export default syntheticMonitorSuite
