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
import { readUserSession } from "@/utils/actions"

export default async function IndexPage() {
  const { data: userSession } = await readUserSession()

  if (userSession.session) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
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
