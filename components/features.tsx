"use client"

import type React from "react"
import { BitcoinIcon, Cloud, Shield, Zap, type LucideIcon } from 'lucide-react'
import { motion } from "framer-motion"
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
    icon: <BitcoinIcon className="size-8" />,
    title: "Blockchain AI Analytics",
    description:
      "Harness the power of blockchain AI to derive actionable insights from your data",
  },
  {
    icon: <Cloud className="size-8" />,
    title: "Hybrid Architecture",
    description:
      "All the benefits of next generation blockchain technology with the ease of todays cloud platforms",
  },
  {
    icon: <Shield className="size-8" />,
    title: "Enterprise Grade Security",
    description: "State of the art security measures to protect your most valuable assets now and into the quantum era.",
  },
  {
    icon: <Zap className="size-8" />,
    title: "Optimal Results",
    description:
      "Optimized for speed and efficiency, our solutions deliver unparalleled performance and energy efficiency.",
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
        <h2 className="mb-10 text-center text-3xl font-bold text-foreground md:text-4xl lg:text-7xl">Transformative Solutions</h2>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default Featurez