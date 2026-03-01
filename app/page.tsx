import { redirect } from "next/navigation"
import { readUserSession } from "@/utils/actions"

import LandingHeader from "@/components/landing/landing-header"
import {
  ExperienceSection,
  FeatureGridSection,
  FinalCtaSection,
  HeroSection,
  IntegrationsSection,
  PersonasSection,
  PrismSection,
  WorkflowSection,
} from "@/components/landing/landing-sections"
import { AppShell, SectionStack } from "@/components/layouts/layout-primitives"

export default async function IndexPage() {
  const userSessionResponse = await readUserSession()

  if (userSessionResponse.data.session) {
    redirect("/dashboard")
  }

  return (
    <AppShell className="bg-background">
      <LandingHeader />
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <SectionStack className="pb-section">
          <HeroSection />
          <ExperienceSection />
          <FeatureGridSection />
          <PersonasSection />
          <PrismSection />
          <IntegrationsSection />
          <WorkflowSection />
          <FinalCtaSection />
        </SectionStack>
      </main>
    </AppShell>
  )
}
