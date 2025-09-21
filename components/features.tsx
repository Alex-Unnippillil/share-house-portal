"use client"

import type React from "react"
import { BedDouble, CalendarClock, CreditCard, FileSignature, Map, MessageSquare } from "lucide-react"
import { motion } from "framer-motion"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Feature {
  icon: React.ReactElement
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: <CreditCard className="size-8" />,
    title: "Stripe rent payments",
    description: "Autopay or collect one-off rent with payouts flowing directly to your house account.",
  },
  {
    icon: <CalendarClock className="size-8" />,
    title: "Cal.com amenity reservations",
    description:
      "Reserve the kitchen, theatre TV, PlayStation lounge, parking spots, or shared computer with instant availability checks.",
  },
  {
    icon: <BedDouble className="size-8" />,
    title: "Overnight visitor bookings",
    description: "Request overnight guests, capture approvals, and sync with security teams before anyone arrives.",
  },
  {
    icon: <FileSignature className="size-8" />,
    title: "Documenso lease room",
    description: "Deliver downloadable agreements, collect signatures, and store renewal packages without email chains.",
  },
  {
    icon: <Map className="size-8" />,
    title: "Per-tenant floorplan overlays",
    description: "Assign storage, chores, and maintenance context across every floor so roommates know exactly where to go.",
  },
  {
    icon: <MessageSquare className="size-8" />,
    title: "Realtime community & admin",
    description: "Moderated message boards, announcements, and RBAC-secured back office dashboards keep everyone aligned.",
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

const Featurez: React.FC = () => {
  return (
    <section className="bg-background py-16">
      <div className="container mx-auto px-4">
        <h2 className="mb-10 text-center text-3xl font-bold text-foreground md:text-4xl lg:text-7xl">
          Shared house essentials
        </h2>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default Featurez
