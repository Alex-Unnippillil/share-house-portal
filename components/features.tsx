"use client"

import type { FC } from "react"
import {
  CalendarCheck2,
  CreditCard,
  FileSignature,
  MessageSquare,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react"
import { motion } from "framer-motion"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: CreditCard,
    title: "Stripe rent automation",
    description:
      "Collect recurring payments, send receipts instantly, and reconcile shared expenses without leaving the dashboard.",
  },
  {
    icon: CalendarCheck2,
    title: "cal.com amenity scheduling",
    description:
      "Keep the gym, yoga studio, or roof deck organized with self-serve bookings that sync directly to residents’ calendars.",
  },
  {
    icon: MessageSquare,
    title: "Supabase realtime message boards",
    description:
      "Announce house updates, vote on events, and resolve maintenance threads together with live notifications.",
  },
  {
    icon: FileSignature,
    title: "Documenso lease locker",
    description:
      "Store e-signed leases, house rules, and move-in checklists with instant download access for every roommate.",
  },
  {
    icon: Users,
    title: "Guided roommate onboarding",
    description:
      "Invite new tenants with templated checklists, Stripe setup guidance, and Supabase RBAC that matches room assignments.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy-first operations",
    description:
      "Tenant documents and payments stay protected with role-based permissions and audit trails across every workflow.",
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
      <Card className="h-full border-primary/10 bg-background/60 shadow-sm transition-shadow duration-300 hover:shadow-lg">
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

const Featurez: FC = () => {
  return (
    <section className="bg-background/50 py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
            Everything shared homes need in one portal
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Connect the tools your community already uses—Stripe, Supabase, cal.com, and Documenso—with flows designed for
            co-living teams.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default Featurez
