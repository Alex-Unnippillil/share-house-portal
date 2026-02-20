import SmartLink from "@/components/navigation/SmartLink"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { integrationHighlights } from "../landing-content"
import { LANDING_SECTION_IDS } from "../landing-ids"
import { MotionReveal } from "../motion"
import { LandingSection, SectionHeading } from "../section-primitives"

export function IntegrationsSection() {
  return (
    <LandingSection
      id={LANDING_SECTION_IDS.integrations}
      headingId="integrations-heading"
      className="border-b border-border/70 bg-muted/10"
      contentClassName="py-20 sm:py-24"
    >
      <SectionHeading
        id="integrations-heading"
        title="Integrations that keep every household workflow in sync"
        className="mb-12"
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {integrationHighlights.map((highlight, index) => (
          <MotionReveal key={highlight.title} delay={0.08 * (index + 1)}>
            <Card className="h-full border-border/70 bg-background/95 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
              <CardHeader className="space-y-4">
                <CardTitle className="text-heading-md">{highlight.title}</CardTitle>
                <CardDescription className="text-base">{highlight.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {highlight.points.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <span className="mt-1 size-2 rounded-full bg-primary" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <SmartLink
                  href={highlight.cta.href}
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "justify-start px-0 text-primary hover:text-primary")}
                  intent="passive"
                >
                  <span>{`${highlight.cta.label} →`}</span>
                </SmartLink>
              </CardContent>
            </Card>
          </MotionReveal>
        ))}
      </div>
    </LandingSection>
  )
}
