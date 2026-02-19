import { redirect } from "next/navigation"

import {
  FeatureGridSection,
  FinalCtaSection,
  HeroSection,
  IntegrationsSection,
  PersonasSection,
  PrismSection,
  WorkflowSection,
} from "@/components/landing/landing-sections"
import LandingHeader from "@/components/landing/landing-header"
import { readUserSession } from "@/utils/actions"

export default async function IndexPage() {
  const userSessionResponse = await readUserSession()

  if (userSessionResponse.data.session) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingHeader />
      <HeroSection />
      <FeatureGridSection />
      <PersonasSection />
      <PrismSection />
      <IntegrationsSection />
      <WorkflowSection />
      <FinalCtaSection />
    </div>
  )
}
