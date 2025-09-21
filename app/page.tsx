import Link from "next/link"
import { redirect } from "next/navigation"

import AnimatedInfographic from "@/components/animated-infographic"
import Cta from "@/components/cta"
import Features from "@/components/features"
import PrismContainer from "@/components/prism-container"
import WhyShareHouseWrapper from "@/components/whyonyxwrapper"
import { buttonVariants } from "@/components/ui/button"
import { siteConfig } from "@/config/site"
import { readUserSession } from "@/utils/actions"

export default async function IndexPage() {
  const { data: userSession } = await readUserSession()

  if (userSession.session) {
    return redirect("/dashboard")
  }

  return (
    <div className="flex flex-col">
      <section
        id="overview"
        className="relative w-full overflow-hidden border-b bg-gradient-to-b from-slate-100 via-white to-slate-100 pb-24 pt-20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
      >
        <div className="container mx-auto grid max-w-6xl gap-12 px-4 md:grid-cols-2 md:px-6 lg:px-8">
          <div className="flex flex-col justify-center space-y-6">
            <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              Simplify shared living
            </span>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              A portal built for roommates, tenants, and property managers
            </h1>
            <p className="text-lg text-muted-foreground">
              Share House Portal centralizes rent collection, amenity scheduling, visitor compliance, and roommate collaboration so every unit stays informed and on time.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href={siteConfig.links.signup} className={buttonVariants({ size: "lg" })}>
                Start onboarding
              </Link>
              <Link
                href={siteConfig.links.login}
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Access the portal
              </Link>
            </div>
            <dl className="grid gap-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Autopay rent completion</dt>
                <dd className="text-2xl font-semibold text-foreground">98% on-time payments</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Amenity utilization</dt>
                <dd className="text-2xl font-semibold text-foreground">5x more reservations</dd>
              </div>
            </dl>
          </div>
          <PrismContainer />
        </div>
      </section>

      <Features />

      <section id="visitors" className="bg-background py-16">
        <div className="container mx-auto grid max-w-5xl gap-10 px-4 md:grid-cols-2 md:px-6 lg:px-8">
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold tracking-tight">Visitor logs that keep everyone in the loop</h2>
            <p className="text-muted-foreground">
              Register overnight guests, capture arrival details, and automatically share notifications with roommates and property managers.
              Built-in limits enforce house rules while audit trails keep compliance teams confident.
            </p>
            <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Policy snapshot</p>
              <ul className="mt-2 space-y-1">
                <li>• Automatic alerts when guests exceed stay limits</li>
                <li>• Export-ready visitor history for security staff</li>
                <li>• Digital acknowledgement of community guidelines</li>
              </ul>
            </div>
          </div>
          <AnimatedInfographic />
        </div>
      </section>

      <WhyShareHouseWrapper />

      <section id="resources" className="border-y bg-muted/40 py-16">
        <div className="container mx-auto flex max-w-5xl flex-col gap-10 px-4 md:flex-row md:items-start md:px-6 lg:px-8">
          <div className="md:w-1/3">
            <h2 className="text-3xl font-semibold tracking-tight">Resources for every role</h2>
            <p className="mt-2 text-muted-foreground">
              Guides and playbooks make onboarding painless for tenants, roommates, and property managers alike.
            </p>
          </div>
          <div className="grid flex-1 gap-6 sm:grid-cols-2">
            <div className="space-y-3 rounded-lg border bg-background p-6 shadow-sm">
              <h3 className="text-xl font-semibold">Tenant handbook</h3>
              <p className="text-sm text-muted-foreground">
                Settle in faster with rent schedules, amenity etiquette, and maintenance expectations tailored to shared homes.
              </p>
              <Link
                href={siteConfig.links.tenantHandbook}
                className="text-sm font-medium text-primary hover:underline"
              >
                View tenant handbook
              </Link>
            </div>
            <div className="space-y-3 rounded-lg border bg-background p-6 shadow-sm">
              <h3 className="text-xl font-semibold">Manager playbook</h3>
              <p className="text-sm text-muted-foreground">
                Standardize communications, reconcile payments, and automate amenity policies without juggling separate tools.
              </p>
              <Link
                href={siteConfig.links.managerGuide}
                className="text-sm font-medium text-primary hover:underline"
              >
                Open manager playbook
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Cta />
    </div>
  )
}
