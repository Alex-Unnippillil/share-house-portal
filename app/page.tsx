import Link from "next/link"
import { redirect } from "next/navigation"

import { siteConfig } from "@/config/site"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { readUserSession } from "@/utils/actions"

const essentials = [
  {
    title: "Pay rent and review receipts",
    description: "Autopay, catch-up payments, and receipt history live in one place.",
  },
  {
    title: "Book shared amenities",
    description: "Reserve kitchens, TV rooms, parking, and shared spaces without conflicts.",
  },
  {
    title: "Stay aligned with roommates",
    description: "Track maintenance, documents, and message board updates from your dashboard.",
  },
]

export default async function IndexPage() {
  const { data: userSession } = await readUserSession()

  if (userSession.session) {
    redirect("/dashboard")
  }

  return (
    <main className="container mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-4 py-16">
      <div className="space-y-6 text-center">
        <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 text-primary">
          Share House Portal
        </Badge>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Login and onboarding first, everything else inside your tenant workspace
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground sm:text-lg">
          {siteConfig.description}
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={siteConfig.links.login}
            className={cn(buttonVariants({ size: "lg" }), "px-8")}
          >
            Log in
          </Link>
          <Link
            href={siteConfig.links.signup}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "px-8")}
          >
            Start onboarding
          </Link>
        </div>
      </div>

      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        {essentials.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle className="text-base">{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  )
}
