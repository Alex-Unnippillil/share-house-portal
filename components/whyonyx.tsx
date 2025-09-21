"use client"

import type { FC } from "react"

import { motion } from "framer-motion"
import {
  BellDot,
  CalendarClock,
  CreditCard,
  FileSignature,
  HeartHandshake,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: CreditCard,
    title: "Stripe flows residents actually use",
    description:
      "Offer autopay, split charges, and one-click receipts so every roommate stays current on rent and utilities.",
  },
  {
    icon: HeartHandshake,
    title: "Community-first communications",
    description:
      "Supabase realtime keeps announcements, polls, and maintenance updates visible to the whole house in seconds.",
  },
  {
    icon: CalendarClock,
    title: "Amenity management made simple",
    description:
      "Sync cal.com calendars with shared spaces to eliminate double-bookings and last-minute surprises.",
  },
  {
    icon: FileSignature,
    title: "Documenso compliance built-in",
    description:
      "Distribute e-signed leases, renewal reminders, and house rules with a permanent audit trail for every document.",
  },
  {
    icon: BellDot,
    title: "Actionable automation",
    description:
      "Trigger reminders, deposit confirmations, and welcome checklists automatically from Supabase events.",
  },
  {
    icon: ShieldCheck,
    title: "Security you can trust",
    description:
      "Granular permissions let property teams, resident leaders, and maintenance vendors access only what they need.",
  },
]

interface FeatureCardProps extends Feature {
  index: number
}

const FeatureCard: FC<FeatureCardProps> = ({ icon: Icon, title, description, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card className="h-full border-primary/10 bg-background/70 shadow-sm transition-shadow hover:shadow-lg">
        <CardHeader>
          <div className="mb-4 flex items-center justify-center">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Icon className="size-6" aria-hidden="true" />
            </div>
          </div>
          <CardTitle className="text-center text-xl font-semibold text-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-center text-sm text-foreground/70">{description}</CardDescription>
        </CardContent>
      </Card>
    </motion.div>
  )
}

const WhyShareHouse: FC = () => {
  return (
    <section className="bg-background py-16">
      <div className="container mx-auto px-4">
        <h2 className="mb-6 text-center text-3xl font-bold text-foreground md:text-4xl">
          Why community managers choose Share House Portal
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-base text-muted-foreground">
          Unite payments, bookings, leases, and resident messaging into one accessible workspace that scales with every new
          property.
        </p>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default WhyShareHouse
