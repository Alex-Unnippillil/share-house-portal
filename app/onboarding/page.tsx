import { Metadata } from "next"
import {
  Building2,
  CalendarCheck,
  ClipboardCheck,
  ShieldCheck,
  Sparkles,
  Users2,
} from "lucide-react"

import SmartLink from "@/components/navigation/SmartLink"
import { CreateHouseholdFlow } from "@/components/onboarding/create-household-flow"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const onboardingHighlights = [
  {
    title: "Unit alignment & rent splits",
    description:
      "Tie your household to a property code, set move-in dates, and log rent obligations so autopay can switch on immediately.",
    icon: Building2,
  },
  {
    title: "Roommate invitations in sync",
    description:
      "Collect names, emails, and rent shares for every roommate so they receive workspace access, bookings, and receipts day one.",
    icon: Users2,
  },
  {
    title: "Safety & logistics surfaced",
    description:
      "Share emergency contacts, parking notes, and household guidelines without messy email threads or sticky notes.",
    icon: ShieldCheck,
  },
  {
    title: "Move-in rituals coordinated",
    description:
      "Create a single source for key handoffs, rent due dates, amenity rules, and visitor policies before anyone unpacks.",
    icon: CalendarCheck,
  },
] as const

const onboardingTimeline = [
  {
    title: "Capture the essentials",
    description:
      "Name your household, map it to the right unit, and confirm rent responsibilities so your property manager can approve fast.",
    icon: ClipboardCheck,
  },
  {
    title: "Send invites & sync managers",
    description:
      "Roommates and property teams receive rich context automatically—no more forwarding spreadsheets or resending forms.",
    icon: Users2,
  },
  {
    title: "Launch the household HQ",
    description:
      "Autopay, bookings, messaging, and visitor approvals ignite together the moment you finish onboarding.",
    icon: Sparkles,
  },
] as const

export const metadata: Metadata = {
  title: "Create your household",
  description:
    "Guide your roommates through Roomsily onboarding. Capture rent splits, invite the crew, and sync property managers in minutes.",
}

export default function OnboardingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.24),transparent_60%)] dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
      </div>

      <div className="container relative mx-auto flex min-h-screen flex-col px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="flex justify-end">
          <SmartLink
            href="/auth"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "rounded-full border border-primary/20 bg-background/70 px-4 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur transition hover:text-foreground"
            )}
          >
            Sign in
          </SmartLink>
        </div>

        <div className="mt-10 grid items-start gap-12 lg:mt-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:gap-16">
          <section className="space-y-10">
            <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              Roomsily onboarding
            </Badge>

            <div className="space-y-6">
              <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                Spin up your household command centre
              </h1>
              <p className="text-lg text-muted-foreground">
                Capture the details that matter—rent splits, invites, emergency contacts, vehicles, and house guidelines. Roomsily packages everything for your property manager so your roommate HQ launches with clarity from day zero.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {onboardingHighlights.map((highlight) => (
                <div
                  key={highlight.title}
                  className="rounded-2xl border border-primary/20 bg-background/70 p-5 shadow-sm backdrop-blur transition hover:border-primary/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <highlight.icon className="size-5" aria-hidden="true" />
                    </span>
                    <p className="text-sm font-semibold text-foreground">{highlight.title}</p>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{highlight.description}</p>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-primary/20 bg-primary/5 p-8 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">How onboarding flows</h2>
                  <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                    Everything you capture feeds a launch-ready workspace for roommates and property teams. Here’s what happens as you move through the steps.
                  </p>
                </div>
              </div>
              <ol className="mt-8 space-y-6">
                {onboardingTimeline.map((item, index) => (
                  <li key={item.title} className="flex gap-4">
                    <div className="flex size-12 items-center justify-center rounded-full border border-primary/30 bg-background text-primary shadow-sm">
                      <item.icon className="size-6" aria-hidden="true" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      <p className="text-xs font-medium uppercase tracking-wide text-primary/70">Step {index + 1}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-8 flex flex-wrap items-center gap-3 text-sm font-medium text-primary">
                <Sparkles className="size-4" aria-hidden="true" />
                <span>Autopay, amenity bookings, visitor approvals, and messaging are ready the moment you launch.</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Need to migrate an existing lease?{" "}
              <SmartLink href="/contact" className="font-medium text-primary underline underline-offset-4">
                Chat with our property team
              </SmartLink>
              .
            </p>
          </section>

          <CreateHouseholdFlow />
        </div>
      </div>
    </div>
  )
}
