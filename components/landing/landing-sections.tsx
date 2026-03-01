import Link from "next/link"
import {
  BellRing,
  CalendarClock,
  FileText,
  ListChecks,
  MessageSquare,
  MonitorSmartphone,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react"

import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import FeaturePrismLazy from "@/components/feature-prism-lazy"
import SmartLink from "@/components/navigation/SmartLink"

import { LANDING_SECTION_IDS } from "./landing-ids"
import LazyMount from "./lazy-mount"

const integrationBadges = [
  "Stripe Billing",
  "Supabase Realtime",
  "Cal.com",
  "Documenso",
]

const heroMetrics = [
  { value: "99.2%", label: "Rent collected on schedule", icon: PiggyBank },
  { value: "8 min", label: "Average roommate onboarding", icon: Users },
  { value: "5x", label: "Fewer amenity conflicts", icon: ListChecks },
]

const heroHighlights = [
  {
    title: "Autopay everyone trusts",
    description:
      "Stripe splits rent automatically, nudges late roommates, and stores a transparent receipt history.",
    icon: Wallet,
  },
  {
    title: "Bookings without friction",
    description:
      "Roommates tap a Cal.com link to hold the kitchen, parking, or gaming nook with real-time conflict checks.",
    icon: CalendarClock,
  },
  {
    title: "Signal over noise",
    description:
      "Threads, polls, and visitor approvals surface the updates that matter so every roommate stays in sync.",
    icon: BellRing,
  },
]

const experienceHighlights = [
  {
    title: "Mobile rhythm for roommates",
    description:
      "Fast thumb-first actions keep shared living simple: pay rent, approve visitors, and claim amenities in seconds.",
    points: [
      "Persistent daily snapshot with payment status and next reservations",
      "One-tap quick actions for bookings, polls, and maintenance updates",
      "Readable cards and spacing tuned for small screens and busy schedules",
    ],
  },
  {
    title: "Desktop clarity for managers",
    description:
      "Larger layouts surface portfolio-level context for landlords and property managers without overwhelming tenants.",
    points: [
      "Split panels for ledger reconciliation, document workflows, and requests",
      "Audit-friendly timelines with role-aware controls for each property",
      "Reference-inspired visual hierarchy focused on scannability and trust",
    ],
  },
]

const portalFeatures = [
  {
    title: "Shared rent autopay",
    description:
      "Stripe Billing handles every roommate split while Supabase keeps the ledger, receipts, and reminders aligned.",
    icon: Wallet,
    href: "/payments",
    ctaLabel: "Review payments",
  },
  {
    title: "Household scheduling",
    description:
      "Embed Cal.com for kitchens, gaming nights, and parking so bookings respect household rules in real time.",
    icon: CalendarClock,
    href: "/bookings",
    ctaLabel: "Book amenities",
  },
  {
    title: "Lease & doc vault",
    description:
      "Documenso workflows send, sign, and archive every agreement with roommate-level access controls.",
    icon: FileText,
    href: "/documents",
    ctaLabel: "Manage documents",
  },
  {
    title: "Roommate message feed",
    description:
      "Supabase realtime threads keep announcements, polls, and repairs transparent across every device.",
    icon: MessageSquare,
    href: "/messaging",
    ctaLabel: "Open messaging",
  },
  {
    title: "Visitor guardrails",
    description:
      "Collect overnight guest details, route approvals, and log entries with policy checks baked in.",
    icon: ShieldCheck,
    href: "/visitors",
    ctaLabel: "Review policies",
  },
  {
    title: "Insights & rituals",
    description:
      "Surface renewals, chores, and maintenance cadences so the household stays proactive instead of reactive.",
    icon: Sparkles,
    href: "/dashboard",
    ctaLabel: "View dashboard",
  },
]

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

const integrationHighlights = [
  {
    title: "Finance spine with Stripe + Supabase",
    description:
      "Give every roommate clarity with automated autopay, instant receipt sharing, and a real-time ledger per unit.",
    points: [
      "Stripe Billing subscriptions mapped to each roommate split",
      "Supabase tables mirror balances, deposits, and late fees",
      "One-click exports for accountants and property managers",
    ],
    cta: { label: "Review rent operations", href: "/payments" },
  },
  {
    title: "Operations kit with Cal.com + Documenso",
    description:
      "Bookings, guests, and legal docs stay synchronized so roommates always know what&rsquo;s next.",
    points: [
      "Conflict-free amenity reservations with Cal.com embeds",
      "Documenso templates for leases, renewals, and addenda",
      "Automated alerts for expiring documents and visitor limits",
    ],
    cta: { label: "See scheduling & docs", href: "/documents" },
  },
]

const workflowSteps = [
  {
    step: "1",
    title: "Invite roommates & assign units",
    description:
      "Sync your roster into Supabase and map rent shares in minutes.",
  },
  {
    step: "2",
    title: "Connect Stripe, Cal.com, Documenso",
    description:
      "Authorize each integration once to unlock autopay, bookings, and eSignatures.",
  },
  {
    step: "3",
    title: "Launch household rituals",
    description:
      "Turn on autopay, publish amenity schedules, and open the roommate feed.",
  },
  {
    step: "4",
    title: "Monitor & iterate together",
    description:
      "Use shared insights to adjust rent splits, policies, and maintenance priorities.",
  },
]

export function HeroSection() {
  return (
    <section
      id={LANDING_SECTION_IDS.hero}
      className="relative overflow-hidden border-b"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.28),transparent_60%)] dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),transparent_60%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background dark:from-primary/15" />
      <div className="layout-content relative py-section">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
          <div className="space-y-10 text-center lg:text-left">
            <div className="flex justify-center lg:justify-start">
              <Badge
                variant="outline"
                className="rounded-full border-primary/30 bg-primary/10 text-primary"
              >
                Tenant portal crafted for shared homes
              </Badge>
            </div>
            <div className="space-y-6">
              <h1 className="text-balance text-display-xl">
                Modern operations for every roommate and property manager
              </h1>
              <p className="mx-auto max-w-2xl text-body-lg text-muted-foreground lg:mx-0">
                Roomsily brings autopay, bookings, documents, and updates into
                an intuitive workspace that keeps households aligned without the
                group-chat chaos.
              </p>
            </div>
            <div className="flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
              <Link
                href={siteConfig.links.login}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-primary px-8 text-base font-semibold shadow-lg shadow-primary/30 transition hover:bg-primary/90"
                )}
              >
                <span>Sign in</span>
              </Link>
              <Link
                href={siteConfig.links.signup}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "border-primary/40 bg-background/80 px-8 text-base font-semibold backdrop-blur transition hover:border-primary hover:bg-primary/10"
                )}
              >
                <span>Create your household</span>
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {heroHighlights.map((item) => (
                <div
                  key={item.title}
                  className="surface-glass surface-hover rounded-2xl p-5 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <item.icon className="size-5" aria-hidden="true" />
                    </span>
                    <p className="text-sm font-semibold text-foreground">
                      {item.title}
                    </p>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground lg:justify-start">
              <span className="font-medium text-foreground">Works with</span>
              {integrationBadges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
          <div className="relative mx-auto flex w-full max-w-xl justify-center">
            <div className="absolute -inset-10 rounded-[3rem] bg-gradient-to-br from-primary/40 via-primary/10 to-transparent blur-3xl" />
            <div className="relative w-full overflow-hidden rounded-3xl border border-primary/30 bg-gradient-dark text-primary-foreground shadow-2xl shadow-primary/20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),transparent_55%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.22),transparent_50%)]" />

              <div className="relative flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-primary/20 text-sm font-bold text-primary">
                    R
                  </span>
                  <div className="leading-tight">
                    <p className="text-sm font-semibold text-white">Roomsily</p>
                    <p className="text-xs text-slate-300">
                      Shared-home command center
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-booking-confirmed/40 bg-booking-confirmed/20 px-3 py-1 text-xs font-medium text-booking-confirmed-background">
                  Autopay synced
                </span>
              </div>

              <div className="relative space-y-4 p-5 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-primary-foreground/20 bg-background/10 p-4 backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.16em] text-primary-foreground/70">
                      Next rent cycle
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-primary-foreground">
                      $4,280 due
                    </p>
                    <p className="mt-1 text-xs text-primary-foreground/70">
                      4 roommates · 82% already funded
                    </p>
                  </div>
                  <div className="rounded-2xl border border-primary-foreground/20 bg-background/10 p-4 backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.16em] text-primary-foreground/70">
                      Today&rsquo;s flow
                    </p>
                    <ul className="mt-3 space-y-2 text-xs text-primary-foreground">
                      <li className="flex items-center gap-2">
                        <CalendarClock className="size-3.5 text-primary" />
                        Kitchen booking · 6:00–8:00 PM
                      </li>
                      <li className="flex items-center gap-2">
                        <BellRing className="size-3.5 text-primary" />
                        Visitor request approved
                      </li>
                      <li className="flex items-center gap-2">
                        <MessageSquare className="size-3.5 text-primary" />
                        Poll closes in 2 hours
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="rounded-2xl border border-primary-foreground/20 bg-background/10 p-4 backdrop-blur">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white">
                      Household health
                    </p>
                    <p className="text-xs text-emerald-200">
                      All systems normal
                    </p>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-primary-foreground/20">
                    <div className="h-full w-[84%] rounded-full bg-gradient-to-r from-booking-confirmed-border to-primary" />
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-primary-foreground/80 sm:grid-cols-3">
                    <span>Payments: 98%</span>
                    <span>Bookings: No conflicts</span>
                    <span>Maintenance SLA: 2.4h</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {heroMetrics.map((metric) => (
            <div
              key={metric.label}
              className="surface-glass flex items-center gap-4 rounded-2xl px-6 py-5 text-left"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <metric.icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-3xl font-semibold text-foreground">
                  {metric.value}
                </p>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function ExperienceSection() {
  return (
    <section
      id={LANDING_SECTION_IDS.experience}
      className="border-b border-border/70 bg-muted/20 py-section"
    >
      <div className="layout-content">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-display-lg">
            Crafted for mobile roommates and desktop operators
          </h2>
          <p className="mt-4 text-muted-foreground">
            The landing experience combines lightweight mobile flows and
            information-rich desktop layouts inspired by best-in-class SaaS
            products.
          </p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {experienceHighlights.map((item, index) => (
            <Card key={item.title} surface="glass" className="h-full">
              <CardHeader className="space-y-4">
                <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MonitorSmartphone className="size-5" aria-hidden="true" />
                </span>
                <CardTitle className="text-heading-md">{item.title}</CardTitle>
                <CardDescription className="text-base">
                  {item.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {item.points.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <span className="mt-1 size-2 rounded-full bg-primary" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {index === 0
                    ? "Optimized for tenants, roommates, and people living together"
                    : "Optimized for landlords and property managers"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export function FeatureGridSection() {
  return (
    <section id={LANDING_SECTION_IDS.features} className="py-section">
      <div className="layout-content">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-display-lg">
            Shared-house workflows in one tenant portal
          </h2>
          <p className="mt-4 text-muted-foreground">
            From rent to repairs, Roomsily keeps every roommate aligned with
            clear automations and actionable insights.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {portalFeatures.map((feature) => (
            <Card
              key={feature.title}
              surface="glass"
              interactive
              className="flex h-full flex-col"
            >
              <CardHeader className="space-y-5">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <feature.icon className="size-5" aria-hidden="true" />
                </div>
                <CardTitle className="text-heading-sm">
                  {feature.title}
                </CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Link
                  href={feature.href}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  <span>{feature.ctaLabel}</span>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export function PersonasSection() {
  return (
    <section
      id={LANDING_SECTION_IDS.personas}
      className="border-y border-border/70 bg-muted/10 py-section"
    >
      <div className="layout-content">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-display-lg">
            Designed for the people using it
          </h2>
          <p className="mt-4 text-muted-foreground">
            Whether you’re paying rent or overseeing dozens of units, Roomsily
            gives every role the clarity they need.
          </p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {personaPlaybooks.map((persona) => (
            <Card
              key={persona.badge}
              surface="glass"
              className="relative h-full overflow-hidden"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),transparent_70%)]" />
              <CardHeader className="relative space-y-4">
                <Badge
                  variant="secondary"
                  className="w-fit rounded-full bg-primary/10 text-primary"
                >
                  {persona.badge}
                </Badge>
                <CardTitle className="text-heading-md">
                  {persona.title}
                </CardTitle>
                <CardDescription className="text-base">
                  {persona.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {persona.points.map((point) => (
                    <li key={point} className="flex items-start gap-3">
                      <span
                        className="mt-1 size-2 rounded-full bg-primary"
                        aria-hidden="true"
                      />
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

export function PrismSection() {
  return (
    <section
      id={LANDING_SECTION_IDS.prism}
      className="border-y border-border/70 bg-muted/20 py-section"
    >
      <div className="layout-content">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <h2 className="text-balance text-display-lg">
              Visualize your household operating system
            </h2>
            <p className="text-muted-foreground">
              The Roomsily network links Stripe, Supabase, Cal.com, and
              Documenso so payments, bookings, documents, and updates move
              together without copy-paste work.
            </p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-1 size-2 rounded-full bg-primary" />
                <span>
                  Orbit between features to see how roommate actions sync across
                  integrations in real time.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 size-2 rounded-full bg-primary" />
                <span>
                  Spot automation opportunities from autopay to amenity
                  approvals without leaving the tenant view.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 size-2 rounded-full bg-primary" />
                <span>
                  Share the visualization during onboarding to align roommates
                  and property managers instantly.
                </span>
              </li>
            </ul>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href={siteConfig.links.contact}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "border-primary/40 bg-background/80 text-primary hover:border-primary hover:bg-primary/10"
                )}
              >
                <span>Book a walkthrough</span>
              </Link>
              <Link
                href={siteConfig.links.signup}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                <span>Start onboarding</span>
              </Link>
            </div>
          </div>
          <div className="relative h-[320px] w-full overflow-hidden rounded-3xl border border-primary/30 bg-background/80 shadow-xl shadow-primary/20 md:h-[420px]">
            <FeaturePrismLazy fallbackLabel="Calibrating shared-house orbit…" />
          </div>
        </div>
      </div>
    </section>
  )
}

export function IntegrationsSection() {
  return (
    <section
      id={LANDING_SECTION_IDS.integrations}
      className="border-b border-border/70 bg-muted/10 py-section"
    >
      <div className="layout-content">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          {integrationHighlights.map((highlight) => (
            <Card key={highlight.title} surface="solid" className="h-full">
              <CardHeader className="space-y-4">
                <CardTitle className="text-heading-md">
                  {highlight.title}
                </CardTitle>
                <CardDescription className="text-base">
                  {highlight.description}
                </CardDescription>
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
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "justify-start px-0 text-primary hover:text-primary"
                  )}
                  intent="passive"
                >
                  <span>{`${highlight.cta.label} →`}</span>
                </SmartLink>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export function WorkflowSection() {
  return (
    <section id={LANDING_SECTION_IDS.workflow} className="py-section">
      <div className="layout-content">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-display-lg">
            How households move into Roomsily
          </h2>
          <p className="mt-4 text-muted-foreground">
            Guided onboarding and contextual tips remove the friction from
            getting every roommate connected.
          </p>
        </div>
        <ol className="relative mt-12 grid gap-6 md:grid-cols-4">
          {workflowSteps.map((item, index) => (
            <li
              key={item.step}
              className="surface-solid relative flex h-full flex-col gap-4 rounded-2xl p-6"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {item.step}
              </span>
              <h3 className="text-heading-sm text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground">
                {item.description}
              </p>
              {index < workflowSteps.length - 1 && (
                <span
                  className="absolute right-[-18px] top-1/2 hidden h-px w-10 -translate-y-1/2 bg-border md:block"
                  aria-hidden="true"
                />
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function FinalCtaSection() {
  return (
    <section id={LANDING_SECTION_IDS.finalCta} className="py-section">
      <div className="layout-content">
        <Card
          surface="elevated"
          className="overflow-hidden border-primary/25 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent"
        >
          <CardContent className="flex flex-col gap-8 px-8 py-12 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl space-y-4">
              <h3 className="text-balance text-display-lg">
                Ready to centre your shared household around clarity?
              </h3>
              <p className="text-body-md text-muted-foreground">
                Launch Roomsily with guided onboarding and give every roommate
                one place to handle payments, bookings, and documents.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <SmartLink
                href={siteConfig.links.signup}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:bg-primary/90"
                )}
                intent="critical"
              >
                <span>Start onboarding</span>
              </SmartLink>
              <SmartLink
                href={siteConfig.links.contact}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "border-primary/40 bg-white/70 px-8 text-base font-semibold text-primary hover:border-primary hover:bg-white"
                )}
                intent="passive"
              >
                <span>Talk with us</span>
              </SmartLink>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
