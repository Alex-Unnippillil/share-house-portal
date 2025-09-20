import Link from "next/link"
import { addMonths, format, startOfMonth } from "date-fns"
import { Home, NotebookPen, Sparkles } from "lucide-react"

import { readUserSession } from "@/utils/actions"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RentPaymentForm } from "@/components/portal/rent-payment-form"
import { LeaseAgreementCard } from "@/components/portal/lease-agreement-card"
import { AmenityReservation } from "@/components/portal/amenity-reservation"
import { SharedSpaceDiagram } from "@/components/portal/shared-space-diagram"
import { MessageBoard } from "@/components/portal/message-board"

const heroHighlights = () => {
  const nextDueDate = startOfMonth(addMonths(new Date(), 1))
  return [
    {
      label: "Next rent due",
      value: format(nextDueDate, "MMMM d, yyyy"),
      description: "AutoPay reminders are sent three days before the due date.",
      icon: Home,
    },
    {
      label: "Amenity on deck",
      value: "Kitchen · Wednesday 7 PM",
      description: "Taylor reserved the space for shared meal prep.",
      icon: NotebookPen,
    },
    {
      label: "Community highlight",
      value: "Compost pickup Thursday",
      description: "Roll the bin to the curb on Wednesday night, thank you!",
      icon: Sparkles,
    },
  ]
}

export default async function IndexPage() {
  const { data: userSession } = await readUserSession()

  if (userSession.session) {
    return redirect("/dashboard")
  }

  const highlights = heroHighlights()

  return (
    <div className="flex flex-col gap-16 pb-16">
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 py-20 text-white">
        <div className="container flex flex-col gap-12">
          <div className="flex flex-col gap-6 lg:w-2/3">
            <span className="w-fit rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm font-medium uppercase tracking-wide">
              Share House Portal
            </span>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              Everything your household needs to stay coordinated
            </h1>
            <p className="text-lg text-white/80">
              Pay rent, review your lease, reserve amenities, and keep the conversation flowing. This dashboard gives every tenant
              clarity about shared spaces and responsibilities.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="#payments">Pay rent</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-white/10 text-white hover:bg-white/20">
                <Link href="#community">Open message board</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {highlights.map((item) => {
              const Icon = item.icon
              return (
                <Card key={item.label} className="border-white/10 bg-white/5 text-white shadow-lg backdrop-blur">
                  <CardContent className="space-y-3 p-6">
                    <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-white/80">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {item.label}
                    </div>
                    <p className="text-xl font-semibold">{item.value}</p>
                    <p className="text-sm text-white/70">{item.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      <section id="essentials" className="container flex flex-col gap-12">
        <div className="space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Household essentials</h2>
          <p className="text-muted-foreground">
            Manage your rent, agreements, and shared amenities without leaving the portal.
          </p>
        </div>
        <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
          <div id="payments">
            <RentPaymentForm />
          </div>
          <div className="space-y-6">
            <LeaseAgreementCard />
            <AmenityReservation />
          </div>
        </div>
      </section>

      <section id="community" className="container flex flex-col gap-12">
        <div className="space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Shared living resources</h2>
          <p className="text-muted-foreground">
            Explore the shared space map and stay in sync with your housemates.
          </p>
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.2fr,1fr]">
          <SharedSpaceDiagram />
          <MessageBoard />
        </div>
      </section>
    </div>
  )
}
