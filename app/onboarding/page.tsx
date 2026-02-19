import { Metadata } from "next"

import { PageContainer } from "@/components/ui/page-layout"

import { loadOnboardingState } from "./loaders"
import { OnboardingClient } from "./onboarding-client"

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Complete onboarding for unit assignment, rent share, emergency contact, and vehicle details.",
}

export default async function OnboardingPage() {
  const data = await loadOnboardingState()

  return (
    <PageContainer variant="narrow">
      <OnboardingClient initialData={data} />
    </PageContainer>
  )
}
