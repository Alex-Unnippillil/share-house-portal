import { Metadata } from "next"

import { loadOnboardingState } from "./loaders"
import { OnboardingClient } from "./onboarding-client"

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Complete onboarding for unit assignment, rent share, emergency contact, and vehicle details.",
}

export default async function OnboardingPage() {
  const data = await loadOnboardingState()

  return (
    <div className="px-4 py-6 sm:px-6">
      <OnboardingClient initialData={data} />
    </div>
  )
}
