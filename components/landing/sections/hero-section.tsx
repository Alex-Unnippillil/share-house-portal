import { BellRing, CalendarClock, MessageSquare } from "lucide-react"

import FeaturePrismLazy from "@/components/feature-prism-lazy"
import { Badge } from "@/components/ui/badge"
import { siteConfig } from "@/config/site"

import { heroHighlights, heroMetrics, integrationBadges } from "../landing-content"
import { BadgeRow, CtaButtonGroup, MetricCard } from "../landing-shared"
import { LANDING_SECTION_IDS } from "../landing-ids"
import { MotionReveal } from "../motion"
import { LandingSection } from "../section-primitives"

export function HeroSection() {
  return (
    <LandingSection
      id={LANDING_SECTION_IDS.hero}
      headingId="hero-heading"
      className="relative overflow-hidden border-b"
      contentClassName="relative py-24 sm:py-32"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.28),transparent_60%)] dark:bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),transparent_60%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background dark:from-primary/15" />
      <div className="relative grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
        <MotionReveal className="space-y-10 text-center lg:text-left">
          <div className="flex justify-center lg:justify-start">
            <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 text-primary">
              Tenant portal crafted for shared homes
            </Badge>
          </div>
          <div className="space-y-6">
            <h1 id="hero-heading" className="text-balance text-display-xl">
              Modern operations for every roommate and property manager
            </h1>
            <p className="mx-auto max-w-2xl text-body-lg text-muted-foreground lg:mx-0">
              Roomsily brings autopay, bookings, documents, and updates into an intuitive workspace
              that keeps households aligned without the group-chat chaos.
            </p>
          </div>
          <CtaButtonGroup
            className="justify-center lg:justify-start"
            buttons={[
              {
                href: siteConfig.links.login,
                label: "Sign in",
                size: "lg",
                className:
                  "bg-primary px-8 text-base font-semibold shadow-lg shadow-primary/30 transition hover:bg-primary/90",
              },
              {
                href: siteConfig.links.signup,
                label: "Create your household",
                variant: "outline",
                size: "lg",
                className:
                  "border-primary/40 bg-background/80 px-8 text-base font-semibold backdrop-blur transition hover:border-primary hover:bg-primary/10",
              },
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            {heroHighlights.map((item, index) => (
              <MotionReveal
                key={item.title}
                delay={0.06 * (index + 1)}
                className="rounded-2xl border border-primary/20 bg-background/80 p-5 text-left shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <item.icon className="size-5" aria-hidden="true" />
                  </span>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{item.description}</p>
              </MotionReveal>
            ))}
          </div>
          <BadgeRow badges={integrationBadges} label="Works with" />
        </MotionReveal>

        <MotionReveal delay={0.12} className="relative mx-auto flex w-full max-w-xl justify-center">
          <div className="absolute -inset-10 rounded-[3rem] bg-gradient-to-br from-primary/40 via-primary/10 to-transparent blur-3xl" />
          <div className="relative w-full overflow-hidden rounded-3xl border border-primary/30 bg-slate-950 text-slate-100 shadow-2xl shadow-primary/20 transition duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),transparent_55%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.22),transparent_50%)]" />
            <div className="relative flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/20 text-sm font-bold text-primary">
                  R
                </span>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-white">Roomsily</p>
                  <p className="text-xs text-slate-300">Shared-home command center</p>
                </div>
              </div>
              <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-200">
                Autopay synced
              </span>
            </div>
            <div className="relative space-y-4 p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Next rent cycle</p>
                  <p className="mt-2 text-2xl font-semibold text-white">$4,280 due</p>
                  <p className="mt-1 text-xs text-slate-300">4 roommates · 82% already funded</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Today&rsquo;s flow</p>
                  <ul className="mt-3 space-y-2 text-xs text-slate-100">
                    <li className="flex items-center gap-2">
                      <CalendarClock className="size-3.5 text-primary" />Kitchen booking · 6:00–8:00 PM
                    </li>
                    <li className="flex items-center gap-2">
                      <BellRing className="size-3.5 text-primary" />Visitor request approved
                    </li>
                    <li className="flex items-center gap-2">
                      <MessageSquare className="size-3.5 text-primary" />Poll closes in 2 hours
                    </li>
                  </ul>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white">Household health</p>
                  <p className="text-xs text-emerald-200">All systems normal</p>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[84%] rounded-full bg-gradient-to-r from-cyan-300 to-primary" />
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-200 sm:grid-cols-3">
                  <span>Payments: 98%</span>
                  <span>Bookings: No conflicts</span>
                  <span>Maintenance SLA: 2.4h</span>
                </div>
              </div>
              <div className="h-[180px] overflow-hidden rounded-2xl border border-white/10 bg-black/20 sm:h-[220px]">
                <FeaturePrismLazy fallbackLabel="Calibrating shared-house orbit…" />
              </div>
            </div>
          </div>
        </MotionReveal>
      </div>
      <div className="relative mt-16 grid gap-4 sm:grid-cols-3">
        {heroMetrics.map((metric, index) => (
          <MotionReveal key={metric.label} delay={0.08 * (index + 1)}>
            <MetricCard value={metric.value} label={metric.label} icon={metric.icon} />
          </MotionReveal>
        ))}
      </div>
    </LandingSection>
  )
}
