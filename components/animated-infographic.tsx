"use client"

import React from "react"
import { motion, useAnimation } from "framer-motion"
import { CalendarCheck, DoorOpen, MessageCircle, PiggyBank } from "lucide-react"
import { useInView } from "react-intersection-observer"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface InfoGraphicItemProps {
  percentage: number
  text: string
  icon: React.ElementType
  index: number
}

const InfoGraphicItem = ({ percentage, text, icon: Icon, index }: InfoGraphicItemProps) => {
  const controls = useAnimation()
  const [ref, inView] = useInView({ threshold: 0.25, triggerOnce: true })

  React.useEffect(() => {
    if (inView) {
      controls.start("visible")
    }
  }, [controls, inView])

  return (
    <motion.div
      ref={ref}
      animate={controls}
      initial="hidden"
      variants={{ visible: { opacity: 1, y: 0 }, hidden: { opacity: 0, y: 24 } }}
      transition={{ duration: 0.4, delay: index * 0.15 }}
      className="group flex flex-col items-center rounded-lg border bg-background/80 p-6 text-center shadow-sm"
    >
      <motion.div
        className="mb-3 flex items-center text-4xl font-bold text-primary"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1 + index * 0.15, type: "spring", stiffness: 120 }}
      >
        <Icon className="mr-2 text-primary" size={28} aria-hidden />
        {percentage}%
      </motion.div>
      <motion.p
        className="mb-4 text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 + index * 0.15 }}
      >
        {text}
      </motion.p>
      <motion.div
        className="w-full"
        initial={{ width: 0 }}
        animate={{ width: "100%" }}
        transition={{ delay: 0.25 + index * 0.15, duration: 0.6, ease: "easeOut" }}
      >
        <Progress value={percentage} className="h-2" aria-label={`${percentage}% ${text}`} />
      </motion.div>
    </motion.div>
  )
}

const metricItems = [
  {
    percentage: 92,
    text: "of tenants enable autopay within their first week",
    icon: PiggyBank,
  },
  {
    percentage: 68,
    text: "fewer amenity conflicts once Cal.com availability rules go live",
    icon: CalendarCheck,
  },
  {
    percentage: 83,
    text: "of visitor approvals are completed within four hours",
    icon: DoorOpen,
  },
  {
    percentage: 88,
    text: "of roommate posts receive a response thanks to realtime threads",
    icon: MessageCircle,
  },
]

const AnimatedInfographic = () => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-semibold md:text-3xl">
          Impact across the Share House Portal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {metricItems.map((item, index) => (
            <InfoGraphicItem key={item.text} {...item} index={index} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default AnimatedInfographic
