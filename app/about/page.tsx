"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, Zap, Shield } from "lucide-react"
import { Contact } from "@/components/forms/contact"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

export default function AboutPage() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const animationEnabled = !prefersReducedMotion

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.section
        initial={animationEnabled ? { opacity: 0, y: 20 } : false}
        animate={animationEnabled ? { opacity: 1, y: 0 } : undefined}
        transition={animationEnabled ? { duration: 0.5 } : undefined}
        className="mb-16 text-center"
      >
        <motion.h1
          initial={animationEnabled ? { scale: 0.9 } : false}
          animate={animationEnabled ? { scale: 1 } : undefined}
          transition={animationEnabled ? { duration: 0.5 } : undefined}
          className="mb-4 text-4xl font-bold"
        >
          About Our Company
        </motion.h1>
        <p className="text-xl text-muted-foreground">
          We&#39;re on a mission to revolutionize the industry with innovative solutions.
        </p>
      </motion.section>

      <motion.section
        initial={animationEnabled ? { opacity: 0 } : false}
        animate={animationEnabled ? { opacity: 1 } : undefined}
        transition={animationEnabled ? { duration: 0.5, delay: 0.2 } : undefined}
        className="mb-16"
      >
        <h2 className="mb-8 text-center text-2xl font-semibold">Our Team</h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {teamMembers.map((member, index) => (
            <motion.div
              key={member.name}
              initial={animationEnabled ? { opacity: 0, y: 20 } : false}
              animate={animationEnabled ? { opacity: 1, y: 0 } : undefined}
              transition={animationEnabled ? { duration: 0.5, delay: index * 0.1 } : undefined}
            >
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
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial={animationEnabled ? { opacity: 0 } : false}
        animate={animationEnabled ? { opacity: 1 } : undefined}
        transition={animationEnabled ? { duration: 0.5, delay: 0.4 } : undefined}
        className="mb-16"
      >
        <h2 className="mb-8 text-center text-2xl font-semibold">Our Values</h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {values.map((value, index) => (
            <motion.div
              key={value.title}
              initial={animationEnabled ? { opacity: 0, scale: 0.9 } : false}
              animate={animationEnabled ? { opacity: 1, scale: 1 } : undefined}
              transition={animationEnabled ? { duration: 0.5, delay: index * 0.1 } : undefined}
              className="text-center"
            >
              <div className="mb-4">{value.icon}</div>
              <h3 className="mb-2 text-xl font-semibold">{value.title}</h3>
              <p className="text-muted-foreground">{value.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial={animationEnabled ? { opacity: 0 } : false}
        animate={animationEnabled ? { opacity: 1 } : undefined}
        transition={animationEnabled ? { duration: 0.5, delay: 0.6 } : undefined}
        className="mb-16"
      >
        <Card>
          <CardHeader>
            <CardTitle className="mb-4 text-2xl font-semibold">Contact Us</CardTitle>
            <CardDescription>Have questions? Get in touch with our team.</CardDescription>
          </CardHeader>
          <CardContent>
          <Contact/>
          </CardContent>
        </Card>
      </motion.section>
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
