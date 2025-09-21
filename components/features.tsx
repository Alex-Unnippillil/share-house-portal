"use client"

import type React from "react"
import { CalendarClock, DoorOpen, PiggyBank, UsersRound } from "lucide-react"
import { motion } from "framer-motion"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Feature {
  id: string
  icon: React.ReactElement
  title: string
  description: string
  benefits: string[]
}

const features: Feature[] = [
  {
    id: "rent",
    icon: <PiggyBank className="size-8" />,
    title: "Rent collection that balances itself",
    description:
      "Split rent by roommate, schedule autopay through Stripe, and reconcile ledger activity without exporting CSV files.",
    benefits: [
      "Auto-generated share by tenant with customizable percentages",
      "Autopay reminders, receipts, and failed payment recovery",
      "One ledger for tenants and managers with export-ready audits",
    ],
  },
  {
    id: "amenities",
    icon: <CalendarClock className="size-8" />,
    title: "Amenity calendars everyone respects",
    description:
      "Coordinate kitchens, lounges, gaming rooms, and parking spots with Cal.com scheduling embedded directly in the portal.",
    benefits: [
      "Prevent double-bookings with availability windows and cooldowns",
      "Recurring reservations for chore rotations or weekly events",
      "Realtime notifications to roommates and property staff",
    ],
  },
  {
    id: "collaboration",
    icon: <UsersRound className="size-8" />,
    title: "Roommate collaboration made transparent",
    description:
      "Message boards, shared tasks, and document storage keep every roommate aligned on maintenance, chores, and shared expenses.",
    benefits: [
      "Pinned announcements for property updates and quiet hours",
      "Task assignments with due dates and completion tracking",
      "Lease agreements and policies one click away for every roommate",
    ],
  },
  {
    id: "policies",
    icon: <DoorOpen className="size-8" />,
    title: "Visitor policies with instant accountability",
    description:
      "Capture guest approvals, overnight limits, and identity details so security teams and property managers stay ahead of compliance.",
    benefits: [
      "Visitor registration forms tailored to each property",
      "Automated roommate approvals and manager escalation",
      "Shareable visitor badges for front-desk check in",
    ],
  },
]

interface FeatureCardProps extends Feature {
  index: number
}

const FeatureCard: React.FC<FeatureCardProps> = ({ id, icon, title, description, benefits, index }) => {
  return (
    <motion.article
      id={id}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      viewport={{ once: true, amount: 0.4 }}
    >
      <Card className="h-full border-primary/10 bg-background/80 backdrop-blur">
        <CardHeader>
          <div className="mb-4 flex items-center justify-center">
            <div className="rounded-full bg-primary/10 p-3 text-primary">{icon}</div>
          </div>
          <CardTitle className="text-center text-xl font-semibold">{title}</CardTitle>
          <CardDescription className="text-center text-base">{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2">
                <span className="mt-1 size-1.5 flex-none rounded-full bg-primary" aria-hidden />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </motion.article>
  )
}

const Features: React.FC = () => {
  return (
    <section className="bg-background py-16">
      <div className="container mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Everything a shared home needs to stay organized</h2>
          <p className="mt-4 text-muted-foreground">
            Stripe, Supabase, and Cal.com power the Share House Portal so every roommate, tenant, and property manager shares the same source of truth.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature, index) => (
            <FeatureCard key={feature.id} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features
