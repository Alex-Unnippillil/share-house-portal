import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { personaPlaybooks } from "../landing-content"
import { LANDING_SECTION_IDS } from "../landing-ids"
import { LandingSection, SectionHeading } from "../section-primitives"

export function PersonasSection() {
  return (
    <LandingSection
      id={LANDING_SECTION_IDS.personas}
      headingId="personas-heading"
      className="border-y border-border/70 bg-muted/10"
      contentClassName="py-20 sm:py-24"
    >
      <SectionHeading
        id="personas-heading"
        title="Designed for the people using it"
        description="Whether you’re paying rent or overseeing dozens of units, Roomsily gives every role the clarity they need."
      />
      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {personaPlaybooks.map((persona) => (
          <Card
            key={persona.badge}
            className="relative h-full overflow-hidden border-border/70 bg-background/90 shadow-sm backdrop-blur"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),transparent_70%)]" />
            <CardHeader className="relative space-y-4">
              <Badge variant="secondary" className="w-fit rounded-full bg-primary/10 text-primary">
                {persona.badge}
              </Badge>
              <CardTitle className="text-heading-md">{persona.title}</CardTitle>
              <CardDescription className="text-base">{persona.description}</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <ul className="space-y-3 text-sm text-muted-foreground">
                {persona.points.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="mt-1 size-2 rounded-full bg-primary" aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </LandingSection>
  )
}
