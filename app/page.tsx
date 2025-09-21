import Link from "next/link"
import { redirect } from "next/navigation"
import { readUserSession } from "@/utils/actions"

import { siteConfig } from "@/config/site"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import AnimatedInfographic from "@/components/animated-infographic"
import Cta from "@/components/cta"
import Featurez from "@/components/features"
import WhyShareHouseWrapper from "@/components/whyonyxwrapper"

export default async function IndexPage() {
  const { data: userSession } = await readUserSession()

  if (userSession.session) {
    return redirect("/dashboard")
  }

  const stackHighlights = [
    "Next.js 14 App Router + TypeScript",
    "Supabase Postgres, Auth & Realtime",
    "Stripe rent payments",
    "Cal.com amenity scheduling",
    "Documenso digital leases",
    "shadcn/ui + Tailwind on Vercel",
  ]

  const workflows = [
    {
      title: "Cal.com amenity reservations",
      description:
        "Reserve the kitchen, theatre TV lounge, PlayStation den, parking bays, or shared computer lab with automatic double-booking prevention.",
    },
    {
      title: "Overnight visitor bookings",
      description:
        "Submit overnight guest requests that route to approvals, notify staff, and sync with house calendars in a single flow.",
    },
    {
      title: "Documenso-powered lease room",
      description:
        "Download executed agreements, sign renewals, and share addendums without leaving the tenant experience.",
    },
    {
      title: "Operations that scale with RBAC",
      description:
        "Empower tenants with realtime message boards, per-tenant floorplan overlays, and an admin back office protected by Supabase roles.",
    },
  ]

  return (
    <section className={cn("relative overflow-hidden pb-16", "w-full", "bg-arctic-gradient")}>
      <div className="container mx-auto flex w-full flex-col items-center space-y-16 px-4 py-16 sm:pb-24">
        <div className="mx-auto flex w-full flex-col items-center gap-y-12 px-4 md:px-6 lg:px-8">
          <h1 className="text-center text-4xl font-extrabold leading-tight tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
            ShareHouse Portal
          </h1>
          <p className="max-w-3xl text-center text-lg text-muted-foreground lg:text-xl">
            A tenant-first co-living portal that centralizes rent payments, amenity scheduling, documents, and community updates
            for every resident.
          </p>
          <div className="flex w-full max-w-4xl flex-wrap justify-center gap-3">
            {stackHighlights.map((highlight) => (
              <span
                key={highlight}
                className="rounded-full border border-primary/40 bg-background/80 px-4 py-2 text-sm font-medium text-primary shadow-sm"
              >
                {highlight}
              </span>
            ))}
          </div>
          <div className="grid w-full gap-6 text-left md:grid-cols-2">
            {workflows.map((workflow) => (
              <div key={workflow.title} className="rounded-2xl border border-border/50 bg-background/90 p-6 shadow-sm backdrop-blur-sm">
                <h3 className="text-lg font-semibold text-foreground">{workflow.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{workflow.description}</p>
              </div>
            ))}
          </div>
        </div>
        <Cta />
        <div className="mb-8 flex gap-6">
          <Link href={siteConfig.links.login} className={buttonVariants()}>
            Tenant Login
          </Link>
          <Link href={siteConfig.links.signup} className={buttonVariants({ variant: "outline" })}>
            Create Account
          </Link>
        </div>
      </div>
      <AnimatedInfographic />
      <Featurez />
      <WhyShareHouseWrapper />
    </section>
  )
}
