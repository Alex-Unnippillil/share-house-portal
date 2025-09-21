"use client"

import type React from "react"
import { motion } from "framer-motion"
import { FileCheck2, Gauge, ShieldCheck, Users } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Benefit {
  icon: React.ReactElement
  title: string
  description: string
}

const benefits: Benefit[] = [
  {
    icon: <Users className="size-8" />,
    title: "Onboarding built for real roommates",
    description: "Capture rent shares, vehicle info, emergency contacts, and storage assignments during one guided flow.",
  },
  {
    icon: <Gauge className="size-8" />,
    title: "Realtime command center",
    description: "Managers reconcile rent, amenity bookings, maintenance tickets, and visitor logs from a single dashboard.",
  },
  {
    icon: <FileCheck2 className="size-8" />,
    title: "Document workflows handled",
    description: "Documenso templates keep every lease, addendum, and chore roster digitally signed and versioned.",
  },
  {
    icon: <ShieldCheck className="size-8" />,
    title: "Security and compliance",
    description: "Supabase row-level security, visitor audit trails, and encrypted storage ensure every household stays protected.",
  },
]

interface BenefitCardProps extends Benefit {
  index: number
}

const BenefitCard: React.FC<BenefitCardProps> = ({ icon, title, description, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      viewport={{ once: true, amount: 0.4 }}
    >
      <Card className="h-full border-primary/10 bg-background/80">
        <CardHeader>
          <div className="mb-4 flex items-center justify-center">
            <div className="rounded-full bg-primary/10 p-3 text-primary">{icon}</div>
          </div>
          <CardTitle className="text-center text-xl font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-center text-base">{description}</CardDescription>
        </CardContent>
      </Card>
    </motion.div>
  )
}

const WhyShareHouse: React.FC = () => {
  return (
    <section id="collaboration" className="bg-muted/40 py-16">
      <div className="container mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Why properties choose the Share House Portal</h2>
          <p className="mt-4 text-muted-foreground">
            Purpose-built workflows bring tenants, roommates, and property teams together without sacrificing security or compliance.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit, index) => (
            <BenefitCard key={benefit.title} {...benefit} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default WhyShareHouse
