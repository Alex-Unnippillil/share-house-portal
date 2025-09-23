import { Metadata } from "next"
import { redirect } from "next/navigation"

import ChecklistProgress from "@/components/onboarding/ChecklistProgress"
import OnboardingFlow from "@/components/onboarding/OnboardingFlow"
import {
  getChecklistStateFromProfile,
  getNextIncompleteStepIndex,
} from "@/lib/onboarding/steps"
import type { Database } from "@/lib/supabase"
import { createClient } from "@/utils/supabase/server"

import {
  submitEmergencyContact,
  submitRentShare,
  submitUnitAssignment,
} from "./actions"

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Roomsily household onboarding",
}

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]

type OnboardingProfile = Pick<
  ProfileRow,
  "unit_id" | "rent_share" | "metadata" | "onboarding_steps"
>

export default async function OnboardingPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("unit_id, rent_share, metadata, onboarding_steps")
    .eq("id", user.id)
    .single()

  const profile = (profileData as OnboardingProfile) ?? null
  const initialSteps = getChecklistStateFromProfile(profile)
  const nextStepIndex = getNextIncompleteStepIndex(initialSteps)

  return (
    <div className="container pb-16 pt-10">
      <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
        <OnboardingFlow
          initialProfile={profile}
          initialSteps={initialSteps}
          initialStepIndex={nextStepIndex}
          submitUnitAssignment={submitUnitAssignment}
          submitRentShare={submitRentShare}
          submitEmergencyContact={submitEmergencyContact}
        />

        <aside className="space-y-6">
          <ChecklistProgress />
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Need assistance?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              If anything looks incorrect, reach out to your property manager so we can get it fixed before move-in.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
