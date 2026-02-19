import dynamic from "next/dynamic"

import { siteConfig } from "@/config/site"

import { CtaButtonGroup } from "../landing-shared"
import { LANDING_SECTION_IDS } from "../landing-ids"
import { LandingSection } from "../section-primitives"

const FeaturePrism = dynamic(() => import("@/components/feature-prism"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-primary/40 bg-background/70 text-sm text-muted-foreground">
      Calibrating shared-house orbit…
    </div>
  ),
})

export function PrismSection() {
  return (
    <LandingSection
      id={LANDING_SECTION_IDS.prism}
      headingId="prism-heading"
      className="border-y border-border/70 bg-muted/20"
      contentClassName="py-20 sm:py-24"
    >
      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <h2 id="prism-heading" className="text-balance text-display-lg">
            Visualize your household operating system
          </h2>
          <p className="text-muted-foreground">
            The Roomsily network links Stripe, Supabase, Cal.com, and Documenso so payments,
            bookings, documents, and updates move together without copy-paste work.
          </p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1 size-2 rounded-full bg-primary" />
              <span>Orbit between features to see how roommate actions sync across integrations in real time.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 size-2 rounded-full bg-primary" />
              <span>Spot automation opportunities from autopay to amenity approvals without leaving the tenant view.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 size-2 rounded-full bg-primary" />
              <span>Share the visualization during onboarding to align roommates and property managers instantly.</span>
            </li>
          </ul>
          <CtaButtonGroup
            className="flex-wrap gap-3 pt-2"
            buttons={[
              {
                href: siteConfig.links.contact,
                label: "Book a walkthrough",
                variant: "outline",
                size: "sm",
                className: "border-primary/40 bg-background/80 text-primary hover:border-primary hover:bg-primary/10",
              },
              {
                href: siteConfig.links.signup,
                label: "Start onboarding",
                size: "sm",
                className: "bg-primary text-primary-foreground hover:bg-primary/90",
              },
            ]}
          />
        </div>
        <div className="relative h-[320px] w-full overflow-hidden rounded-3xl border border-primary/30 bg-background/80 shadow-xl shadow-primary/20 md:h-[420px]">
          <FeaturePrism />
        </div>
      </div>
    </LandingSection>
  )
}
