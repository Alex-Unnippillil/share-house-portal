import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { CalendarClock, FileText, MessageSquare, Wallet } from "lucide-react"

import { siteConfig } from "@/config/site"
import SmartLink from "@/components/navigation/SmartLink"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { readUserSession } from "@/utils/actions"

const portalFeatures = [
  {
    title: "Pay and track rent",
    description:
      "Set up autopay, split rent by roommate, and keep a clear payment history.",
    icon: Wallet,
    href: "/payments",
    ctaLabel: "View payments",
  },
  {
    title: "Book shared amenities",
    description:
      "Reserve kitchens, parking, and common spaces with conflict-free scheduling.",
    icon: CalendarClock,
    href: "/bookings",
    ctaLabel: "Open bookings",
  },
  {
    title: "Manage leases and documents",
    description:
      "Send, sign, and store agreements in one secure document workspace.",
    icon: FileText,
    href: "/documents",
    ctaLabel: "Open documents",
  },
  {
    title: "Keep everyone informed",
    description:
      "Share announcements, polls, and maintenance updates in a single feed.",
    icon: MessageSquare,
    href: "/messaging",
    ctaLabel: "Open messaging",
  },
]

const onboardingSteps = [
  {
    step: "Step 1",
    title: "Create your household",
    description: "Set up your property, units, and basic household details.",
  },
  {
    step: "Step 2",
    title: "Invite residents",
    description: "Send invites to roommates or tenants and assign their roles.",
  },
  {
    step: "Step 3",
    title: "Activate workflows",
    description:
      "Turn on payments, bookings, messaging, and documents so everyone can start using the portal.",
  },
]

export default async function IndexPage() {
  const { data: userSession } = await readUserSession()

  if (userSession.session) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.28),transparent_60%)] dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background dark:from-primary/15" />
        <div className="container relative mx-auto px-4 py-24 sm:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
            <div className="space-y-8 text-center lg:text-left">
              <div className="flex justify-center lg:justify-start">
                <Badge
                  variant="outline"
                  className="rounded-full border-primary/30 bg-primary/10 text-primary"
                >
                  Tenant portal for shared homes
                </Badge>
              </div>
              <div className="space-y-4">
                <h1 className="text-balance text-display-xl">
                  One place to run shared-home life
                </h1>
                <p className="mx-auto max-w-2xl text-body-lg text-muted-foreground lg:mx-0">
                  Roomsily helps tenants, roommates, and property managers
                  manage rent, shared space bookings, documents, and household
                  updates without scattered tools.
                </p>
              </div>
              <div className="flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
                <Link
                  href={siteConfig.links.signup}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "bg-primary px-8 text-base font-semibold shadow-lg shadow-primary/30 transition hover:bg-primary/90"
                  )}
                >
                  <span>Start onboarding</span>
                </Link>
                <Link
                  href={siteConfig.links.login}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "border-primary/40 bg-background/80 px-8 text-base font-semibold backdrop-blur transition hover:border-primary hover:bg-primary/10"
                  )}
                >
                  <span>Sign in</span>
                </Link>
              </div>
            </div>
            <div className="relative mx-auto flex w-full max-w-xl justify-center">
              <div className="absolute -inset-10 rounded-[3rem] bg-gradient-to-br from-primary/40 via-primary/10 to-transparent blur-3xl" />
              <div className="relative w-full overflow-hidden rounded-3xl border border-primary/30 bg-background/80 shadow-2xl shadow-primary/20 backdrop-blur">
                <Image
                  src="/roomsily-og.svg"
                  alt="Roomsily tenant portal preview showing rent, bookings, and messages"
                  width={960}
                  height={720}
                  priority
                  sizes="(min-width: 1024px) 480px, 100vw"
                  className="w-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border/70 bg-background py-20 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-display-lg">What the portal covers</h2>
            <p className="mt-4 text-muted-foreground">
              Core workflows for day-to-day shared-home operations.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {portalFeatures.map((feature) => (
              <Card
                key={feature.title}
                className="h-full border-border/70 bg-background/95 shadow-sm"
              >
                <CardHeader className="space-y-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <feature.icon className="size-5" aria-hidden="true" />
                  </span>
                  <CardTitle className="text-heading-sm">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <SmartLink
                    href={feature.href}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "justify-start px-0 text-primary hover:text-primary"
                    )}
                    intent="passive"
                  >
                    <span>{`${feature.ctaLabel} →`}</span>
                  </SmartLink>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border/70 bg-muted/20 py-20 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-display-lg">Simple onboarding</h2>
            <p className="mt-4 text-muted-foreground">
              Get your household live in three clear steps.
            </p>
          </div>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {onboardingSteps.map((item) => (
              <li
                key={item.step}
                className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm"
              >
                <p className="text-sm font-semibold text-primary">{item.step}</p>
                <h3 className="mt-3 text-heading-sm text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="pb-24 pt-16">
        <div className="container mx-auto px-4">
          <Card className="overflow-hidden border-none bg-gradient-to-r from-primary/20 via-primary/10 to-transparent shadow-lg">
            <CardContent className="flex flex-col gap-8 px-8 py-12 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl space-y-4">
                <h3 className="text-balance text-display-lg">
                  Ready to onboard your household?
                </h3>
                <p className="text-body-md text-muted-foreground">
                  Start with a guided setup and give everyone one direct portal
                  for rent, bookings, documents, and updates.
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
    </div>
  )
}
