import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { portalFeatures } from "../landing-content"
import { LANDING_SECTION_IDS } from "../landing-ids"
import { LandingSection, SectionHeading } from "../section-primitives"

export function FeatureGridSection() {
  return (
    <LandingSection id={LANDING_SECTION_IDS.features} headingId="features-heading" contentClassName="py-20 sm:py-24">
      <SectionHeading
        id="features-heading"
        title="Shared-house workflows in one tenant portal"
        description="From rent to repairs, Roomsily keeps every roommate aligned with clear automations and actionable insights."
      />
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {portalFeatures.map((feature) => (
          <Card
            key={feature.title}
            className="flex h-full flex-col border-border/70 bg-card/80 shadow-sm shadow-primary/10 transition hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg"
          >
            <CardHeader className="space-y-5">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <feature.icon className="size-5" aria-hidden="true" />
              </div>
              <CardTitle className="text-heading-sm">{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Link href={feature.href} className="text-sm font-medium text-primary hover:underline">
                <span>{feature.ctaLabel}</span>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </LandingSection>
  )
}
