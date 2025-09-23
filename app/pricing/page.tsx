import React, { Fragment } from "react"

import SmartLink from "@/components/navigation/SmartLink"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { PRICING_FEATURE_MATRIX, PRICING_PLANS } from "@/config/pricing"
import { formatCurrency } from "@/lib/payments/currency"
import { cn } from "@/lib/utils"
import { UpgradeButton } from "./_components/upgrade-button"
import {
  CalendarClock,
  Check,
  Minus,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react"

const heroHighlights = [
  {
    title: "Stripe autopay spine",
    description:
      "Collect rent on schedule with roommate-level receipts, catch-up flows, and ledger transparency.",
    icon: Wallet,
  },
  {
    title: "Amenity governance",
    description:
      "Coordinate kitchens, parking, and gaming nooks with conflict-free Cal.com bookings and reminders.",
    icon: CalendarClock,
  },
  {
    title: "Policy guardrails",
    description:
      "Documenso workflows, visitor approvals, and RBAC keep every household compliant by default.",
    icon: ShieldCheck,
  },
  {
    title: "Roommate accountability",
    description:
      "Realtime messaging, polls, and insights drive shared rituals that scale beyond a single unit.",
    icon: Users,
  },
]

const popularPlan = PRICING_PLANS.find((plan) => plan.mostPopular) ?? PRICING_PLANS[1]

export default function PricingPage() {
  return (
    <div className="container max-w-6xl space-y-16 py-16">
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <Badge variant="outline" className="border-primary/30 text-primary">
          Pricing
        </Badge>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Plans built for every shared home
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Roomsily keeps rent, amenities, documents, and visitor policies in
            sync as your community grows. Choose the plan that matches your
            operational playbook and upgrade without switching tools.
          </p>
        </div>
        {popularPlan && (
          <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
            <UpgradeButton
              priceId={popularPlan.priceId}
              planId={popularPlan.id}
              planName={popularPlan.name}
              size="lg"
              className="sm:w-auto"
            >
              {popularPlan.ctaLabel}
            </UpgradeButton>
            <SmartLink
              href="/contact"
              className={cn(
                buttonVariants({ variant: "ghost", size: "lg" }),
                "sm:w-auto"
              )}
              intent="navigation"
            >
              Talk with a specialist
            </SmartLink>
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {heroHighlights.map((highlight) => (
          <Card key={highlight.title} className="h-full border-dashed">
            <CardHeader className="flex flex-row items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <highlight.icon className="size-5" />
              </div>
              <div className="space-y-1 text-left">
                <CardTitle className="text-base font-semibold">
                  {highlight.title}
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {highlight.description}
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {PRICING_PLANS.map((plan) => {
          const formattedPrice =
            plan.priceMonthly === 0
              ? "Free"
              : formatCurrency(plan.priceMonthly, plan.currency)

          return (
            <Card
              key={plan.id}
              className={cn(
                "flex h-full flex-col justify-between border",
                plan.mostPopular
                  ? "border-primary shadow-lg shadow-primary/10"
                  : "border-border"
              )}
            >
              <CardHeader className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl font-semibold">
                      {plan.name}
                    </CardTitle>
                    {plan.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {plan.badge}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-base">
                    {plan.tagline}
                  </CardDescription>
                </div>
                <div className="space-y-1 text-left">
                  <p className="text-4xl font-semibold">{formattedPrice}</p>
                  <p className="text-sm text-muted-foreground">
                    {plan.priceSuffix}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <ul className="space-y-3 text-sm">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 text-primary" />
                      <span className="text-muted-foreground">{perk}</span>
                    </li>
                  ))}
                </ul>
                <div className="rounded-lg border border-dashed border-primary/20 bg-primary/5 p-4 text-sm">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Usage included
                  </h3>
                  <dl className="mt-3 grid gap-2">
                    {plan.usage.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between gap-4"
                      >
                        <dt className="text-muted-foreground">{item.label}</dt>
                        <dd className="font-medium text-foreground">
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <UpgradeButton
                  priceId={plan.priceId}
                  planId={plan.id}
                  planName={plan.name}
                  variant={plan.mostPopular ? "default" : "outline"}
                  className="w-full"
                >
                  {plan.ctaLabel}
                </UpgradeButton>
                <p className="text-xs text-muted-foreground">
                  Support: {plan.support}
                </p>
              </CardFooter>
            </Card>
          )
        })}
      </section>

      <section className="space-y-6">
        <div className="max-w-3xl space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Feature comparison
          </h2>
          <p className="text-muted-foreground">
            Every plan includes core roommate workflows. Higher tiers unlock
            advanced automation, analytics, and concierge support.
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl border">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                  Capability
                </th>
                {PRICING_PLANS.map((plan) => (
                  <th
                    key={plan.id}
                    className="px-4 py-3 text-left text-sm font-semibold text-foreground"
                  >
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {PRICING_FEATURE_MATRIX.map((section) => (
                <Fragment key={section.category}>
                  <tr className="bg-muted/40">
                    <th
                      colSpan={PRICING_PLANS.length + 1}
                      className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {section.category}
                    </th>
                  </tr>
                  {section.features.map((feature) => (
                    <tr key={feature.label} className="align-top">
                      <td className="px-4 py-4 text-sm">
                        <div className="font-medium text-foreground">
                          {feature.label}
                        </div>
                        {feature.description && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {feature.description}
                          </p>
                        )}
                      </td>
                      {PRICING_PLANS.map((plan) => {
                        const value = feature.plans[plan.id]
                        return (
                          <td key={plan.id} className="px-4 py-4 text-sm">
                            {typeof value === "boolean" ? (
                              value ? (
                                <span className="inline-flex items-center gap-2 font-medium text-emerald-600">
                                  <Check className="size-4" />
                                  Included
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-2 text-muted-foreground">
                                  <Minus className="size-4" />
                                  Not included
                                </span>
                              )
                            ) : (
                              <span className="font-medium text-foreground">
                                {value}
                              </span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {popularPlan && (
        <section className="overflow-hidden rounded-3xl border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 sm:p-12">
          <div className="grid gap-8 md:grid-cols-[2fr_1fr] md:items-center">
            <div className="space-y-4">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Ready to upgrade?
              </h2>
              <p className="text-base text-muted-foreground">
                Stripe handles billing while Roomsily centralizes operations.
                Launch {popularPlan.name} today and give every roommate a calm
                command centre for rent, amenities, and compliance.
              </p>
            </div>
            <div className="space-y-3">
              <UpgradeButton
                priceId={popularPlan.priceId}
                planId={popularPlan.id}
                planName={popularPlan.name}
                size="lg"
                className="md:w-full"
              >
                {popularPlan.ctaLabel}
              </UpgradeButton>
              <SmartLink
                href="/privacy"
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                intent="navigation"
              >
                Review billing & privacy terms
              </SmartLink>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
