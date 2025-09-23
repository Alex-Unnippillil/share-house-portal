import type { Database } from "@/lib/supabase"

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]

export type OnboardingStepKey =
  | "unitAssignment"
  | "rentShare"
  | "emergencyContacts"

export type OnboardingStepsState = Record<OnboardingStepKey, boolean>

export type EmergencyContact = {
  name: string
  phone: string
}

export type OnboardingActionResult = {
  success: boolean
  error?: string
}

export const ONBOARDING_PROGRESS_EVENT = "onboarding:step-updated" as const

export const ONBOARDING_STEPS: ReadonlyArray<{
  key: OnboardingStepKey
  title: string
  description: string
}> = [
  {
    key: "unitAssignment",
    title: "Confirm your unit",
    description:
      "Let us know which unit you're moving into so we can map rent, roommates, and amenity access.",
  },
  {
    key: "rentShare",
    title: "Set your rent share",
    description:
      "Tell us how much of the monthly rent you're responsible for so autopay and ledgers stay accurate.",
  },
  {
    key: "emergencyContacts",
    title: "Add an emergency contact",
    description:
      "Provide a contact person so property managers can reach someone quickly if there's an urgent issue.",
  },
]

export const EMPTY_ONBOARDING_STEPS_STATE: OnboardingStepsState = {
  unitAssignment: false,
  rentShare: false,
  emergencyContacts: false,
}

export function normalizeOnboardingSteps(input: unknown): OnboardingStepsState {
  const normalized: OnboardingStepsState = { ...EMPTY_ONBOARDING_STEPS_STATE }

  if (input && typeof input === "object" && !Array.isArray(input)) {
    const record = input as Record<string, unknown>

    for (const key of Object.keys(normalized) as OnboardingStepKey[]) {
      normalized[key] = record[key] === true
    }
  }

  return normalized
}

export function markStepComplete(
  input: unknown,
  step: OnboardingStepKey,
): OnboardingStepsState {
  const normalized = normalizeOnboardingSteps(input)
  normalized[step] = true
  return normalized
}

export function extractEmergencyContacts(
  metadata: ProfileRow["metadata"] | null | undefined,
): EmergencyContact[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return []
  }

  const rawContacts = (metadata as Record<string, unknown>).emergencyContacts
  if (!Array.isArray(rawContacts)) {
    return []
  }

  return rawContacts
    .filter((contact): contact is Record<string, unknown> =>
      Boolean(contact && typeof contact === "object" && !Array.isArray(contact)),
    )
    .map((contact) => ({
      name: typeof contact.name === "string" ? contact.name : "",
      phone: typeof contact.phone === "string" ? contact.phone : "",
    }))
    .filter((contact) => contact.name.trim().length > 0 && contact.phone.trim().length > 0)
}

export function getChecklistStateFromProfile(
  profile:
    | (Pick<ProfileRow, "unit_id" | "rent_share" | "metadata" | "onboarding_steps"> & {
        onboarding_steps: ProfileRow["onboarding_steps"]
      })
    | null,
): OnboardingStepsState {
  const normalized = normalizeOnboardingSteps(profile?.onboarding_steps)

  if (profile?.unit_id && profile.unit_id.trim().length > 0) {
    normalized.unitAssignment = true
  }

  if (profile?.rent_share !== null && profile?.rent_share !== undefined) {
    normalized.rentShare = true
  }

  const contacts = extractEmergencyContacts(profile?.metadata)
  if (contacts.length > 0) {
    normalized.emergencyContacts = true
  }

  return normalized
}

export function computeOnboardingCompletion(state: OnboardingStepsState) {
  const total = ONBOARDING_STEPS.length
  const completed = (Object.keys(state) as OnboardingStepKey[]).reduce(
    (count, key) => count + (state[key] ? 1 : 0),
    0,
  )
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100)

  return { completed, total, percentage }
}

export function getNextIncompleteStepIndex(state: OnboardingStepsState): number {
  return ONBOARDING_STEPS.findIndex((step) => !state[step.key])
}
