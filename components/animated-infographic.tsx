"use client"

import React from "react"
import { motion, useAnimation } from "framer-motion"
import { CalendarCheck2, CreditCard, FileSignature, MessageSquare } from "lucide-react"
import { useInView } from "react-intersection-observer"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const InfoGraphicItem = ({
  percentage,
  text,
  icon: Icon,
  index,
}: {
  percentage: number
  text: string
  icon: React.ElementType
  index: number
}) => {
  const controls = useAnimation()
  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: true,
  })

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
      variants={{
        visible: { opacity: 1, y: 0 },
        hidden: { opacity: 0, y: 50 },
      }}
      transition={{ duration: 0.5, delay: index * 0.2 }}
      className="group mb-8 flex flex-col items-center"
    >
      <motion.div
        className="mb-2 flex items-center text-4xl font-bold text-primary"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2 + index * 0.2, type: "spring", stiffness: 100 }}
      >
        <Icon className="mr-2 text-primary" size={32} aria-hidden="true" />
        {percentage}%
      </motion.div>
      <motion.div
        className="mb-4 max-w-xs text-center text-sm text-foreground/80"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 + index * 0.2 }}
      >
        {text}
      </motion.div>
      <motion.div
        className="w-full max-w-[220px]"
        initial={{ width: 0 }}
        animate={{ width: "100%" }}
        transition={{ delay: 0.6 + index * 0.2, duration: 1, ease: "easeOut" }}
      >
        <Progress value={percentage} className="h-2" aria-hidden="true" />
      </motion.div>
    </motion.div>
  )
}

const AnimatedInfographic = () => {
  const items = [
    {
      percentage: 92,
      text: "Residents enrolled in Stripe autopay within their first week.",
      icon: CreditCard,
    },
    {
      percentage: 87,
      text: "Amenity bookings confirmed through cal.com without staff intervention.",
      icon: CalendarCheck2,
    },
    {
      percentage: 78,
      text: "Lease packets signed in Documenso within 24 hours of being issued.",
      icon: FileSignature,
    },
    {
      percentage: 94,
      text: "House announcements viewed via Supabase realtime message boards.",
      icon: MessageSquare,
    },
  ]

  return (
    <Card className="mx-auto w-full max-w-5xl border-primary/10 bg-background/80 shadow-md">
      <CardHeader>
        <CardTitle className="text-center text-3xl font-bold text-foreground md:text-4xl">
          Shared living operations at a glance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gap-8 space-y-8 md:grid md:grid-cols-2 md:space-y-0">
          {items.map((item, index) => (
            <InfoGraphicItem
              key={item.text}
              percentage={item.percentage}
              text={item.text}
              icon={item.icon}
              index={index}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default AnimatedInfographic
