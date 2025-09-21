"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"

import { siteConfig } from "@/config/site"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const timeline = [
  "Send a cal.com tour link to prospective housemates.",
  "Collect deposits with Stripe and confirm in Supabase.",
  "Issue Documenso leases and welcome packets automatically.",
]

export default function Cta() {
  return (
    <section className="py-4 sm:py-6 lg:py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-5xl"
        >
          <Card className="overflow-hidden border-primary/10 bg-background/80 shadow-lg">
            <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
              <div className="flex flex-col justify-between p-8 sm:p-10">
                <CardHeader className="space-y-4 p-0 text-left">
                  <CardTitle className="text-3xl font-bold sm:text-4xl">
                    Give every resident a guided move-in experience
                  </CardTitle>
                  <CardDescription className="text-base text-muted-foreground">
                    Share House Portal handles the onboarding sequence—book a tour, secure the room, and deliver signed
                    paperwork—so your team can focus on welcoming the community.
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-8 flex flex-col gap-6 p-0">
                  <ol className="space-y-3 text-sm text-foreground/80">
                    {timeline.map((step, index) => (
                      <li key={step} className="flex items-start gap-3">
                        <span className="mt-1 inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={siteConfig.links.contact}
                      className={buttonVariants({ size: "lg" })}
                    >
                      Book a walkthrough
                    </Link>
                    <Link
                      href={siteConfig.links.signup}
                      className={buttonVariants({ variant: "outline", size: "lg" })}
                    >
                      Start inviting roommates
                    </Link>
                  </div>
                </CardContent>
              </div>
              <div className="relative hidden min-h-[18rem] md:block">
                <Image
                  src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80"
                  alt="Co-living apartment with a communal kitchen and seating area."
                  fill
                  className="object-cover"
                  sizes="(min-width: 768px) 40vw, 100vw"
                  priority={false}
                />
                <div className="absolute inset-x-6 bottom-6 rounded-2xl bg-background/90 p-4 shadow-xl">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Live activity</p>
                  <ul className="mt-2 space-y-1 text-sm text-foreground/80">
                    <li>Supabase: Rent receipt posted for Unit 4B</li>
                    <li>cal.com: Sauna reserved Saturday 5–7 PM</li>
                    <li>Documenso: Lease renewal signed by Jordan</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}
