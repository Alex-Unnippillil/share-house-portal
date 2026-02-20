import { Card, CardContent } from "@/components/ui/card"
import { siteConfig } from "@/config/site"

import { CtaButtonGroup } from "../landing-shared"
import { LANDING_SECTION_IDS } from "../landing-ids"
import { MotionReveal } from "../motion"
import { LandingSection } from "../section-primitives"

export function FinalCtaSection() {
  return (
    <LandingSection
      id={LANDING_SECTION_IDS.finalCta}
      headingId="cta-heading"
      className="pb-24"
      contentClassName=""
    >
      <MotionReveal>
        <Card className="overflow-hidden border-none bg-gradient-to-r from-primary/20 via-primary/10 to-transparent shadow-lg">
          <CardContent className="flex flex-col gap-8 px-6 py-10 text-center sm:px-8 sm:py-12 sm:text-left md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl space-y-4">
              <h2 id="cta-heading" className="text-balance text-display-lg">
                Ready to centre your shared household around clarity?
              </h2>
              <p className="text-body-md text-muted-foreground">
                Launch Roomsily with guided onboarding and give every roommate one place to handle
                payments, bookings, and documents.
              </p>
            </div>
            <CtaButtonGroup
              className="w-full justify-center md:w-auto md:justify-end"
              buttons={[
                {
                  href: siteConfig.links.signup,
                  label: "Start onboarding",
                  size: "lg",
                  useSmartLink: true,
                  intent: "critical",
                  className:
                    "bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:bg-primary/90",
                },
                {
                  href: siteConfig.links.contact,
                  label: "Talk with us",
                  variant: "outline",
                  size: "lg",
                  useSmartLink: true,
                  intent: "passive",
                  className:
                    "border-primary/40 bg-white/70 px-8 text-base font-semibold text-primary hover:border-primary hover:bg-white",
                },
              ]}
            />
          </CardContent>
        </Card>
      </MotionReveal>
    </LandingSection>
  )
}
