"use client"

import { type ElementType } from "react"

import { motion, type MotionProps } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, Zap, Shield } from "lucide-react"
import { Contact } from "@/components/forms/contact"
import { useShouldReduceMotion } from "@/hooks/use-should-reduce-motion"

export default function AboutPage() {
  const shouldReduceMotion = useShouldReduceMotion()
  const motionState = shouldReduceMotion ? "reduced" : "enabled"
  const Section: ElementType = shouldReduceMotion ? "section" : motion.section
  const Heading: ElementType = shouldReduceMotion ? "h1" : motion.h1
  const AnimatedDiv: ElementType = shouldReduceMotion ? "div" : motion.div

  const fadeUp = (delay = 0): MotionProps =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.12, delay, ease: "easeOut" },
        }

  const scaleIn = (delay = 0): MotionProps =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, scale: 0.97 },
          animate: { opacity: 1, scale: 1 },
          transition: { duration: 0.12, delay, ease: "easeOut" },
        }

  return (
    <div className="container mx-auto px-4 py-12" data-motion-reduced={shouldReduceMotion ? "true" : "false"}>
      <Section {...(shouldReduceMotion ? {} : fadeUp())} data-motion={motionState} className="mb-16 text-center">
        <Heading {...(shouldReduceMotion ? {} : scaleIn())} data-motion={motionState} className="mb-4 text-4xl font-bold">
          About Our Company
        </Heading>
        <p className="text-xl text-muted-foreground">
          We&#39;re on a mission to revolutionize the industry with innovative solutions.
        </p>
      </Section>

      <Section {...(shouldReduceMotion ? {} : fadeUp(0.04))} data-motion={motionState} className="mb-16">
        <h2 className="mb-8 text-center text-2xl font-semibold">Our Team</h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {teamMembers.map((member, index) => (
            <AnimatedDiv key={member.name} {...(shouldReduceMotion ? {} : fadeUp(index * 0.04))} data-motion={motionState}>
              <Card>
                <CardHeader className="text-center">
                  <Avatar className="mx-auto mb-4 size-24">
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback>
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle>{member.name}</CardTitle>
                  <CardDescription>{member.role}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-center">{member.bio}</p>
                </CardContent>
              </Card>
            </AnimatedDiv>
          ))}
        </div>
      </Section>

      <Section {...(shouldReduceMotion ? {} : fadeUp(0.08))} data-motion={motionState} className="mb-16">
        <h2 className="mb-8 text-center text-2xl font-semibold">Our Values</h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {values.map((value, index) => (
            <AnimatedDiv
              key={value.title}
              {...(shouldReduceMotion ? {} : scaleIn(index * 0.04))}
              data-motion={motionState}
              className="text-center"
            >
              <div className="mb-4">{value.icon}</div>
              <h3 className="mb-2 text-xl font-semibold">{value.title}</h3>
              <p className="text-muted-foreground">{value.description}</p>
            </AnimatedDiv>
          ))}
        </div>
      </Section>

      <Section {...(shouldReduceMotion ? {} : fadeUp(0.12))} data-motion={motionState} className="mb-16">
        <Card>
          <CardHeader>
            <CardTitle className="mb-4 text-2xl font-semibold">Contact Us</CardTitle>
            <CardDescription>Have questions? Get in touch with our team.</CardDescription>
          </CardHeader>
          <CardContent>
            <Contact />
          </CardContent>
        </Card>
      </Section>
    </div>
  )
}

const teamMembers = [
  {
    name: "Jane Doe",
    role: "CEO & Founder",
    bio: "Visionary leader with 15+ years of experience in tech innovation.",
    avatar: "/placeholder.svg?height=100&width=100",
  },
  {
    name: "John Smith",
    role: "CTO",
    bio: "Tech guru passionate about creating cutting-edge solutions.",
    avatar: "/placeholder.svg?height=100&width=100",
  },
  {
    name: "Emily Brown",
    role: "Head of Design",
    bio: "Creative mind behind our stunning user interfaces and experiences.",
    avatar: "/placeholder.svg?height=100&width=100",
  },
]

const values = [
  {
    title: "Innovation",
    description: "We constantly push boundaries to create groundbreaking solutions.",
    icon: <Star className="mx-auto size-12 text-primary" />,
  },
  {
    title: "Efficiency",
    description: "We optimize our processes to deliver results quickly and effectively.",
    icon: <Zap className="mx-auto size-12 text-primary" />,
  },
  {
    title: "Integrity",
    description: "We uphold the highest standards of honesty and transparency in all we do.",
    icon: <Shield className="mx-auto size-12 text-primary" />,
  },
]
