import type { ElementType } from "react"

import SmartLink from "@/components/navigation/SmartLink"
import { Contact } from "@/components/forms/contact"
import { Icons } from "@/components/icons"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { siteConfig } from "@/config/site"
import { createClient } from "@/utils/supa-server-actions"
import { Mail, MapPin, Clock, Phone } from "lucide-react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function ContactPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth")
  }

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-6rem)] flex-col gap-10 px-4 py-12 lg:py-16">
      <SmartLink href="/" className="inline-flex w-fit items-center gap-2 text-sm font-medium text-primary">
        <Icons.logo className="size-5" aria-hidden="true" />
        <span>{siteConfig.name}</span>
      </SmartLink>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-start">
        <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-background/90 p-8 shadow-lg shadow-primary/10 backdrop-blur">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),transparent_65%)]" />
          <div className="relative space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary/80">Talk with the team</p>
              <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                We’re here to help your shared households run smoother
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground">
                Tell us about your property, roommates, or rollout plans. We typically respond within one business day with next
                steps and resources tailored to your household.
              </p>
            </div>
            <Separator className="bg-border/80" />
            <div className="relative">
              <Contact />
            </div>
          </div>
        </section>
        <aside className="space-y-6">
          <Card className="border-border/70 bg-background/90 shadow-md shadow-primary/5">
            <CardHeader>
              <CardTitle>Reach us directly</CardTitle>
              <CardDescription>
                Prefer a direct conversation? Choose the best channel for your team and we’ll connect you with a product
                specialist.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <ContactDetail
                icon={MapPin}
                label="Headquarters"
                value="Toronto, Canada"
                helper="Serving roommate communities across North America"
              />
              <ContactDetail
                icon={Clock}
                label="Support hours"
                value="Monday to Friday · 9 a.m. – 6 p.m. ET"
                helper="Emergency maintenance escalation is available 24/7"
              />
              <ContactDetail
                icon={Mail}
                label="Email"
                value="alex@myunni.com"
                href="mailto:alex@myunni.com"
                helper="We reply within one business day"
              />
              <ContactDetail
                icon={Phone}
                label="Phone"
                value="+1 (416) 706-3586"
                href="tel:+14167063586"
                helper="Available during support hours"
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

type ContactDetailProps = {
  icon: ElementType
  label: string
  value: string
  helper?: string
  href?: string
}

function ContactDetail({ icon: Icon, label, value, helper, href }: ContactDetailProps) {
  const content = (
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-base font-semibold text-foreground">{value}</p>
      {helper ? <p className="text-sm text-muted-foreground">{helper}</p> : null}
    </div>
  )

  return (
    <div className="flex gap-4">
      <span className="mt-1 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      {href ? (
        <a href={href} className="flex flex-col gap-1 text-left transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  )
}
