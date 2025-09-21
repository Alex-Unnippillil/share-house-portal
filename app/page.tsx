import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { CalendarClock, CheckCircle2, CreditCard, FileText, MessageSquare } from "lucide-react"

import { readUserSession } from "@/utils/actions"

import { siteConfig } from "@/config/site"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import AnimatedInfographic from "@/components/animated-infographic"
import Cta from "@/components/cta"
import Featurez from "@/components/features"
import WhyOnyxWrapper from "@/components/whyonyxwrapper"

const heroHighlights = [
  {
    icon: CreditCard,
    label: "Stripe-powered rent collection with instant receipts",
  },
  {
    icon: CalendarClock,
    label: "Real-time amenity scheduling through cal.com",
  },
  {
    icon: FileText,
    label: "Documenso e-signatures and lease downloads on demand",
  },
  {
    icon: MessageSquare,
    label: "Community message boards synced with Supabase realtime",
  },
]

export default async function IndexPage() {
  const { data: userSession } = await readUserSession()

  if (userSession.session) {
    return redirect("/dashboard")
  }

  return (
    <section className={cn("relative", "overflow-hidden", "bg-arctic-gradient", "w-full", "max-w-dvw")}>
      <div className="container px-4 py-16 sm:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Streamlined tenant portal for shared homes
            </div>
            <h1 className="text-balance text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Collect rent, coordinate amenities, and keep every roommate in sync.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Share House Portal centralizes the tools co-living communities rely on—from Stripe rent automation
              to Supabase-powered message boards—so housemates and operators always know what’s next.
            </p>
            <ul className="grid gap-4 sm:grid-cols-2" role="list">
              {heroHighlights.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-start gap-3 rounded-lg border border-primary/10 bg-background/40 p-4"
                >
                  <span className="mt-1 rounded-full bg-primary/10 p-1 text-primary" aria-hidden="true">
                    <Icon className="size-4" />
                  </span>
                  <span className="text-sm text-foreground/80 sm:text-base">{label}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-4">
              <Link href={siteConfig.links.signup} className={buttonVariants({ size: "lg" })}>
                Launch the tenant portal
              </Link>
              <Link
                href="#tenant-cta"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                View scheduling options
              </Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-xl">
            <div className="relative overflow-hidden rounded-3xl border border-primary/10 bg-background/70 shadow-xl">
              <Image
                src="https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1200&q=80"
                alt="Roommates gathering in a modern co-living lounge."
                width={1200}
                height={960}
                className="size-full object-cover"
                priority
              />
            </div>
            <div className="absolute -bottom-8 right-4 w-56 rounded-2xl border border-primary/10 bg-background/95 p-4 shadow-lg sm:-bottom-10 sm:right-10 sm:w-64">
              <p className="text-sm font-semibold text-foreground">Tonight’s bookings</p>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2">
                  <span>Yoga studio</span>
                  <span className="font-medium text-primary">7:00 PM</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2">
                  <span>Roof deck</span>
                  <span className="font-medium text-primary">8 guests</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2">
                  <span>Media room</span>
                  <span className="font-medium text-primary">9:30 PM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="container space-y-16 pb-20">
        <div id="tenant-cta">
          <Cta />
        </div>
        <AnimatedInfographic />
        <Featurez />
        <WhyOnyxWrapper />
      </div>
    </section>
  )
}
