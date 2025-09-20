"use client"

import type React from "react"

import { motion } from "framer-motion"
import { Mail, BitcoinIcon, Palette, DollarSign, type LucideIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Icons } from "./icons"

interface Feature {
  icon: React.ReactElement<LucideIcon>
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: <Mail className="size-8" />,
    title: "USPS-Compliant Solutions",
    description:
      "Engineered to bring high tech to global supply chain and logistics industries.",
  },
  {
    icon: <BitcoinIcon className="size-8" />,
    title: "Enterprise Blockchain",
    description:
      "Onyx's next generation blockchain architecture is designed for optimal enterprise usability.",
  },
  {
    icon: <Palette className="size-8" />,
    title: "Custom Branding",
    description: "Onyx white label enhances your brand's sustainability story.",
  },
  {
    icon: <DollarSign className="size-8" />,
    title: "Lower Costs, Higher Impact",
    description:
      "Cut costs, exceed sustainability goals without added complexity.",
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

const WhyOnyx: React.FC = () => {
  return (
    <section className="bg-background py-16">
      <div className="container mx-auto px-4">
        <h2 className="mb-12 text-center text-3xl font-bold text-foreground md:text-4xl">Why Onyx?</h2>
   
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default WhyOnyx

