"use client"

import type React from "react"
import { CalendarClock, CreditCard, Database, FileSignature, Server, Sparkles } from "lucide-react"
import { motion } from "framer-motion"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Feature {
  icon: React.ReactElement
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: <Server className="size-8" />,
    title: "Next.js 14 App Router",
    description: "Server Actions, streaming, and instant navigation keep tenants productive on every device.",
  },
  {
    icon: <Database className="size-8" />,
    title: "Supabase Postgres platform",
    description: "Auth, storage, and realtime channels secure rent, amenity, and message board data out of the box.",
  },
  {
    icon: <CreditCard className="size-8" />,
    title: "Stripe-powered rent",
    description: "Automated billing, reminders, and ledger exports streamline monthly close for house managers.",
  },
  {
    icon: <CalendarClock className="size-8" />,
    title: "Cal.com integrations",
    description: "Sync amenity reservations and overnight visitor bookings to a single source of truth with no double-booking.",
  },
  {
    icon: <FileSignature className="size-8" />,
    title: "Documenso documents",
    description: "Deliver downloadable leases, capture signatures, and manage compliance with version-controlled templates.",
  },
  {
    icon: <Sparkles className="size-8" />,
    title: "shadcn/ui + Tailwind on Vercel",
    description: "Accessible components and zero-config deployments keep the portal polished, fast, and dependable.",
  },
]

interface FeatureCardProps extends Feature {
  index: number
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card className="h-full transition-shadow duration-300 hover:shadow-lg">
        <CardHeader>
          <div className="mb-4 flex items-center justify-center">
            <div className="rounded-full bg-primary/10 p-2 text-primary">{icon}</div>
          </div>
          <CardTitle className="text-center text-xl font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-center">{description}</CardDescription>
        </CardContent>
      </Card>
    </motion.div>
  )
}

const WhyShareHouse: React.FC = () => {
  return (
    <section className="bg-background py-16">
      <div className="container mx-auto px-4">
        <h2 className="mb-12 text-center text-3xl font-bold text-foreground md:text-4xl">Why ShareHouse Portal?</h2>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default WhyShareHouse
