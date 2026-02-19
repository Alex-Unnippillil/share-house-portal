"use client"

import Link from "next/link"

import { siteConfig } from "@/config/site"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { PersonaToggle, type Persona } from "./persona-toggle"

const personaPlaybooks = [
  {
    badge: "Roommates",
    title: "A calmer home hub",
    description:
      "Track rent, chores, and shared spaces from a mobile-first portal that respects everyone’s time.",
    points: [
      "Automatic rent splits with clear history and reminders for each roommate",
      "A personalised daily agenda of bookings, chores, and open polls",
      "Visitor check-ins and document vaults that remove guesswork",
    ],
  },
  {
    badge: "Property teams",
    title: "Operations with context",
    description:
      "Connect leasing, finance, and community updates to lower churn and support happier households.",
    points: [
      "Stripe, Supabase, and Documenso data aligned in one control centre",
      "Real-time alerts when payments slip or maintenance escalates",
      "Exports, audit trails, and permissions tuned for compliance",
    ],
  },
]

const ctaLabelByPersona: Record<Persona, string> = {
  roommate: "Create your household",
  property_manager: "Set up property operations",
}

export function PersonasSection() {
  const [selectedPersona, setSelectedPersona] = useLocalStorage<Persona | null>(
    "roomsily:landing:persona",
    null
  )

  const secondaryCtaLabel =
    selectedPersona === null
      ? "Explore tenant and manager workflows"
      : ctaLabelByPersona[selectedPersona]

  return (
    <section className="border-y border-border/70 bg-muted/10 py-20 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-display-lg">Designed for the people using it</h2>
          <p className="mt-4 text-muted-foreground">
            Whether you’re paying rent or overseeing dozens of units, Roomsily gives every role
            the clarity they need.
          </p>
          <div className="mt-6 flex flex-col items-center gap-4">
            <PersonaToggle value={selectedPersona} onChange={setSelectedPersona} />
            <Link
              href={siteConfig.links.signup}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "border-primary/40 bg-background/80 font-medium text-primary hover:border-primary hover:bg-primary/10"
              )}
            >
              <span>{secondaryCtaLabel}</span>
            </Link>
          </div>
        </div>
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
      </div>
    </section>
  )
}
