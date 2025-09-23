import type { Tables } from "@/lib/supabase"

export const ONBOARDING_STEPS = [
  {
    key: "unit_assignment",
    title: "Confirm your unit",
    description: "Let us know which unit you're moving into so we can connect you with the right roommates.",
  },
  {
    key: "rent_share",
    title: "Set your rent share",
    description: "Share how much of the monthly rent you're responsible for so payments stay in sync.",
  },
  {
    key: "emergency_contacts",
    title: "Add an emergency contact",
    description: "Provide someone we can reach in the rare case of an urgent situation.",
  },
] as const

export type OnboardingStepDefinition = (typeof ONBOARDING_STEPS)[number]
export type OnboardingStepKey = OnboardingStepDefinition["key"]
export type OnboardingStepState = Record<OnboardingStepKey, boolean>

export type EmergencyContact = {
  name: string
  phone: string
  relationship?: string
  notes?: string
}

export const DEFAULT_STEP_STATE: OnboardingStepState = {
  unit_assignment: false,
  rent_share: false,
  emergency_contacts: false,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function parseEmergencyContacts(value: unknown): EmergencyContact[] {
  if (!Array.isArray(value)) {
    return []
  }

  const contacts: EmergencyContact[] = []

  for (const entry of value) {
    if (!isRecord(entry)) {
      continue
    }

    const name = typeof entry.name === "string" ? entry.name.trim() : ""
    const phone = typeof entry.phone === "string" ? entry.phone.trim() : ""
    const relationship =
      typeof entry.relationship === "string" && entry.relationship.trim()
        ? entry.relationship.trim()
        : undefined
    const notes =
      typeof entry.notes === "string" && entry.notes.trim()
        ? entry.notes.trim()
        : undefined

    if (!name || !phone) {
      continue
    }

    contacts.push({ name, phone, relationship, notes })
  }

  return contacts
}

export function parseOnboardingSteps(value: unknown): OnboardingStepState {
  const state: OnboardingStepState = { ...DEFAULT_STEP_STATE }

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry !== "string") {
        continue
      }

      const key = entry as OnboardingStepKey
      if (key in state) {
        state[key] = true
      }
    }
    return state
  }

  if (isRecord(value)) {
    for (const step of ONBOARDING_STEPS) {
      const rawValue = value[step.key]
      if (typeof rawValue === "boolean") {
        state[step.key] = rawValue
      }
    }
  }

  return state
}

function extractMetadataContacts(metadata: Tables<"profiles">["metadata"]): EmergencyContact[] {
  if (!isRecord(metadata)) {
    return []
  }

  return parseEmergencyContacts(metadata.emergency_contacts)
}

export function mergeCompletedSteps(
  existing: unknown,
  completedStep: OnboardingStepKey,
): OnboardingStepKey[] {
  const state = parseOnboardingSteps(existing)
  state[completedStep] = true

  return ONBOARDING_STEPS.filter((step) => state[step.key]).map((step) => step.key)
}

type ProfileContactFields = Pick<Tables<"profiles">, "emergency_contacts" | "metadata">

export function collectEmergencyContacts(
  profile: Partial<ProfileContactFields> | null,
): EmergencyContact[] {
  if (!profile) {
    return []
  }

  const combined = [
    ...parseEmergencyContacts(profile.emergency_contacts ?? null),
    ...extractMetadataContacts(profile.metadata ?? null),
  ]

  const uniqueContacts: EmergencyContact[] = []
  const seen = new Set<string>()

  for (const contact of combined) {
    const identifier = `${contact.name.toLowerCase()}::${contact.phone}`
    if (seen.has(identifier)) {
      continue
    }
    seen.add(identifier)
    uniqueContacts.push(contact)
  }

  return uniqueContacts
}

type ProfileProgressFields = Pick<
  Tables<"profiles">,
  "unit_id" | "rent_share" | "onboarding_steps" | "emergency_contacts" | "metadata"
>

export function deriveStepStateFromProfile(
  profile: Partial<ProfileProgressFields> | null,
): OnboardingStepState {
  const state = parseOnboardingSteps(profile?.onboarding_steps ?? null)

  if (profile?.unit_id) {
    state.unit_assignment = true
  }

  if (typeof profile?.rent_share === "number" && Number.isFinite(profile.rent_share)) {
    state.rent_share = true
  }

  const contacts = collectEmergencyContacts(profile)

  if (contacts.length > 0) {
    state.emergency_contacts = true
  }

  return state
}

export function calculateCompletion(state: OnboardingStepState): {
  completed: number
  total: number
  percent: number
} {
  const total = ONBOARDING_STEPS.length
  const completed = ONBOARDING_STEPS.reduce(
    (count, step) => (state[step.key] ? count + 1 : count),
    0,
  )

  const percent = total === 0 ? 0 : Math.round((completed / total) * 100)

  return { completed, total, percent }
}
