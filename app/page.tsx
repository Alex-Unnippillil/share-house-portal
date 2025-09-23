import dynamic from "next/dynamic"
import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import {
  CalendarClock,
  FileText,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react"

import { readUserSession } from "@/utils/actions"
import { siteConfig } from "@/config/site"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const FeaturePrism = dynamic(() => import("@/components/feature-prism"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-primary/40 bg-background/70 text-sm text-muted-foreground">
      Calibrating shared-house orbit…
    </div>
  ),
})

const integrationBadges = [
  "Stripe Billing",
  "Supabase Realtime",
  "Cal.com",
  "Documenso",
]

const heroMetrics = [
  { value: "99.2%", label: "Rent collected on schedule" },
  { value: "8 min", label: "Average roommate onboarding" },
  { value: "5x", label: "Fewer amenity conflicts" },
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
    description: "Sync your roster into Supabase and map rent shares in minutes.",
  },
  {
    step: "2",
    title: "Connect Stripe, Cal.com, Documenso",
    description: "Authorize each integration once to unlock autopay, bookings, and eSignatures.",
  },
  {
    step: "3",
    title: "Launch household rituals",
    description: "Turn on autopay, publish amenity schedules, and open the roommate feed.",
  },
  {
    step: "4",
    title: "Monitor & iterate together",
    description: "Use shared insights to adjust rent splits, policies, and maintenance priorities.",
  },
]

export default async function IndexPage() {
  const { data: userSession } = await readUserSession()

  if (userSession.session) {
    return redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.28),transparent_60%)] dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background dark:from-primary/15" />
        <div className="container relative mx-auto px-4 py-24 sm:py-32">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
            <div className="space-y-10 text-center lg:text-left">
              <div className="flex justify-center lg:justify-start">
                <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 text-primary">
                  Tenant portal for shared homes
                </Badge>
              </div>
              <div className="space-y-6">
                <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                  Run your shared home with one tenant portal
                </h1>
                <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl lg:mx-0">
                  Roomsily weaves Stripe autopay, Cal.com bookings, Documenso eSignatures, and Supabase messaging into a calm,
                  accountable workspace for every roommate.
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
                  Sign in
                </Link>
                <Link
                  href={siteConfig.links.signup}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "border-primary/40 bg-background/80 px-8 text-base font-semibold backdrop-blur transition hover:border-primary hover:bg-primary/10"
                  )}
                >
                  Create your household
                </Link>
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
              <div className="relative w-full overflow-hidden rounded-3xl border border-primary/30 bg-background/80 shadow-2xl shadow-primary/20 backdrop-blur">
                <div className="absolute right-6 top-6 flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  Autopay synced
                </div>
                <Image
                  src="/roomsily-og.svg"
                  alt="Roomsily tenant portal preview showing rent, bookings, and messages"
                  width={960}
                  height={720}
                  priority
                  sizes="(min-width: 1024px) 480px, 100vw"
                  className="w-full object-contain"
                />
                <div className="absolute bottom-6 left-6 flex flex-col gap-3 rounded-2xl border border-white/20 bg-background/90 p-4 text-left shadow-lg shadow-primary/10">
                  <p className="text-sm font-semibold text-foreground">Tonight&rsquo;s schedule</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <CalendarClock className="size-4 text-primary" />
                    <span>Kitchen reserved · 6–8pm</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <MessageSquare className="size-4 text-primary" />
                    <span>Roommate poll closes in 2 hours</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-16 grid gap-4 sm:grid-cols-3">
            {heroMetrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-border/60 bg-background/80 px-6 py-5 text-left shadow-sm backdrop-blur"
              >
                <p className="text-3xl font-semibold text-foreground">{metric.value}</p>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Shared-house workflows in one tenant portal
          </h2>
          <p className="mt-4 text-muted-foreground">
            From rent to repairs, Roomsily keeps every roommate aligned with clear automations and actionable insights.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {portalFeatures.map((feature) => (
            <Card key={feature.title} className="flex h-full flex-col border-border/70 bg-card/80 backdrop-blur">
              <CardHeader className="space-y-4">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <feature.icon className="size-5" />
                </div>
                <CardTitle className="text-xl font-semibold">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Link href={feature.href} className="text-sm font-medium text-primary hover:underline">
                  {feature.ctaLabel}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border/70 bg-muted/20 py-20 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Visualize your household operating system
              </h2>
              <p className="text-muted-foreground">
                The Roomsily network links Stripe, Supabase, Cal.com, and Documenso so payments, bookings, documents, and
                updates move together without copy-paste work.
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
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href={siteConfig.links.contact}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "border-primary/40 bg-background/80 text-primary hover:border-primary hover:bg-primary/10"
                  )}
                >
                  Book a walkthrough
                </Link>
                <Link
                  href={siteConfig.links.signup}
                  className={cn(buttonVariants({ size: "sm" }), "bg-primary text-primary-foreground hover:bg-primary/90")}
                >
                  Start onboarding
                </Link>
              </div>
            </div>
            <div className="relative h-[320px] w-full overflow-hidden rounded-3xl border border-primary/30 bg-background/80 shadow-xl shadow-primary/20 md:h-[420px]">
              <FeaturePrism />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border/70 bg-muted/10 py-20 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            {integrationHighlights.map((highlight) => (
              <Card key={highlight.title} className="h-full border-border/70 bg-background">
                <CardHeader>
                  <CardTitle className="text-2xl font-semibold">{highlight.title}</CardTitle>
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
                  <Link
                    href={highlight.cta.href}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "justify-start px-0 text-primary hover:text-primary"
                    )}
                  >
                    {highlight.cta.label} →
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            How households move into Roomsily
          </h2>
          <p className="mt-4 text-muted-foreground">
            Guided onboarding and contextual tips remove the friction from getting every roommate connected.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {workflowSteps.map((item) => (
            <Card key={item.step} className="h-full border-border/70">
              <CardHeader>
                <Badge variant="secondary" className="size-9 rounded-full text-base font-semibold">
                  {item.step}
                </Badge>
                <CardTitle className="mt-4 text-xl font-semibold">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="pb-24">
        <div className="container mx-auto px-4">
          <Card className="overflow-hidden border-none bg-gradient-to-r from-primary/20 via-primary/10 to-transparent shadow-lg">
            <CardContent className="flex flex-col gap-8 px-8 py-12 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl space-y-4">
                <h3 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Ready to align your shared household?
                </h3>
                <p className="text-base text-muted-foreground">
                  Spin up Roomsily with Stripe autopay, Cal.com bookings, Documenso agreements, and Supabase messaging in a few
                  guided steps.
                </p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href={siteConfig.links.signup}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:bg-primary/90"
                  )}
                >
                  Start onboarding
                </Link>
                <Link
                  href={siteConfig.links.contact}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "border-primary/40 bg-white/70 px-8 text-base font-semibold text-primary hover:border-primary hover:bg-white"
                  )}
                >
                  Talk with us
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
