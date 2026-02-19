"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { HTMLMotionProps } from "framer-motion"
import type { ReactNode } from "react"

type MotionRevealProps = Omit<HTMLMotionProps<"div">, "children"> & {
  children: ReactNode
  delay?: number
  distance?: number
}

export function MotionReveal({
  children,
  delay = 0,
  distance = 14,
  transition,
  ...props
}: MotionRevealProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: distance }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={reduceMotion ? undefined : { once: true, amount: 0.2 }}
      transition={
        reduceMotion
          ? undefined
          : { duration: 0.4, ease: "easeOut", delay, ...transition }
      }
      {...props}
    >
      {children}
    </motion.div>
  )
}
