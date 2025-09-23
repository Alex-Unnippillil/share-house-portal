import SmartLink from "@/components/navigation/SmartLink"
import { redirect } from "next/navigation"
import {
  CalendarRange,
  FileText,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react"

import { FeaturePrismLazy } from "@/components/feature-prism-lazy"
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

const heroMetrics = [
  { value: "98%", label: "On-time rent collection" },
  { value: "5+", label: "Amenities coordinated" },
  { value: "24/7", label: "Realtime roommate updates" },
]

const features = [
  {
    title: "Clarity for every payment",
    description:
      "Split rent by roommate, automate autopay, and keep a clean ledger backed by Stripe and Supabase.",
    icon: Wallet,
    href: "/payments",
  },
  {
    title: "Effortless amenity booking",
    description:
      "Reserve kitchen time, game nights, or parking with conflict-aware scheduling powered by Cal.com.",
    icon: CalendarRange,
    href: "/bookings",
  },
  {
    title: "Organized document vault",
    description:
      "Store leases, addenda, and move-in checklists with Documenso signing flows and version history.",
    icon: FileText,
    href: "/documents",
  },
  {
    title: "Roommate messaging feed",
    description:
      "Keep conversations on-topic with realtime threads, polls, and alerts that sync across every device.",
    icon: MessageSquare,
    href: "/messaging",
  },
  {
    title: "Visitor & guest controls",
    description:
      "Approve overnight guests, capture details, and notify every roommate without leaving the dashboard.",
    icon: ShieldCheck,
    href: "/visitors",
  },
  {
    title: "Smart household insights",
    description:
      "See upcoming renewals, chores, and maintenance timelines at a glance with proactive reminders.",
    icon: Sparkles,
    href: "/dashboard",
  },
]

const workflow = [
  {
    step: "1",
    title: "Create your household",
    description:
      "Invite roommates, assign units, and import leases so everyone starts on the same page.",
  },
  {
    step: "2",
    title: "Automate the essentials",
    description:
      "Enable autopay, sync amenity calendars, and upload documents with a few guided prompts.",
  },
  {
    step: "3",
    title: "Stay effortlessly aligned",
    description:
      "Roomsily keeps payments, bookings, and updates flowing so the household can focus on living well.",
  },
]

const highlights = [
  {
    title: "Finance cockpit",
    description:
      "Every roommate sees the same ledger, receipts, and outstanding balances in real time.",
    points: [
      "Autopay with configurable due dates and grace periods",
      "Catch-up flows for partial or one-off payments",
      "Downloadable receipts and exportable CSV summaries",
    ],
    cta: { label: "Explore payments", href: "/payments" },
  },
  {
    title: "Operations command center",
    description:
      "Bookings, documents, visitors, and maintenance live in one calm interface for the entire property.",
    points: [
      "One-click amenity reservations that respect household rules",
      "Documenso-powered signing with secure access logging",
      "Visitor workflows with automatic roommate notifications",
    ],
    cta: { label: "View the dashboard", href: "/dashboard" },
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
          <div className="mx-auto max-w-3xl space-y-8 text-center">
            <div className="flex justify-center">
              <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 text-primary">
                www.roomsily
              </Badge>
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Co-living operations, beautifully orchestrated
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Roomsily centralizes rent, amenities, documents, and roommate communication into one elegant portal so shared homes stay calm, coordinated, and connected.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <SmartLink
                href={siteConfig.links.login}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-primary px-8 text-base font-semibold shadow-lg shadow-primary/30 transition hover:bg-primary/90"
                )}
                intent="critical"
              >
                Sign in
              </SmartLink>
              <SmartLink
                href={siteConfig.links.signup}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "border-primary/40 bg-background/80 px-8 text-base font-semibold backdrop-blur transition hover:border-primary hover:bg-primary/10"
                )}
                intent="critical"
              >
                Create your household
              </SmartLink>
            </div>
            <div className="grid gap-4 pt-8 sm:grid-cols-3">
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
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything your household needs in one portal
          </h2>
          <p className="mt-4 text-muted-foreground">
            From rent to repairs, Roomsily keeps every roommate aligned with modern UI patterns and actionable insights.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="h-full border-border/70 bg-card/80 backdrop-blur">
              <CardHeader className="space-y-4">
                <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <feature.icon className="size-5" />
                </div>
                <CardTitle className="text-xl font-semibold">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <SmartLink
                  href={feature.href}
                  className="text-sm font-medium text-primary hover:underline"
                  intent="passive"
                >
                  Learn more
                </SmartLink>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border/70 bg-muted/10 py-20 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl space-y-4 text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Explore the Roomsily feature prism
            </h2>
            <p className="text-muted-foreground">
              Navigate our interactive 3D showcase to see how payments, bookings, messaging, and automations connect inside the
              portal.
            </p>
          </div>
          <FeaturePrismLazy className="mx-auto mt-12 max-w-6xl" />
        </div>
      </section>

      <section className="border-t border-border/70 bg-muted/20 py-20 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            {highlights.map((highlight) => (
              <Card key={highlight.title} className="h-full border-border/70 bg-background">
                <CardHeader>
                  <CardTitle className="text-2xl font-semibold">{highlight.title}</CardTitle>
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
                    {highlight.cta.label} →
                  </SmartLink>
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
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {workflow.map((item) => (
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
                  Ready to bring calm to your shared home?
                </h3>
                <p className="text-base text-muted-foreground">
                  Create a Roomsily household in minutes and invite roommates to experience modern, transparent co-living.
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
                  Get started
                </SmartLink>
                <SmartLink
                  href={siteConfig.links.contact}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "border-primary/40 bg-white/70 px-8 text-base font-semibold text-primary hover:border-primary hover:bg-white"
                  )}
                >
                  Talk with us
                </SmartLink>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
