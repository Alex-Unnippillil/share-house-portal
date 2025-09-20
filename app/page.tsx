import Link from "next/link"
import { redirect } from "next/navigation"

import AnimatedInfographic from "@/components/animated-infographic"
import Cta from "@/components/cta"
import Featurez from "@/components/features"
import PrismContainer from "@/components/prism-container"
import WhyOnyxWrapper from "@/components/whyonyxwrapper"
import { buttonVariants } from "@/components/ui/button"
import { siteConfig } from "@/config/site"
import { readUserSession } from "@/utils/actions"

export default async function IndexPage() {
  const { data: userSession } = await readUserSession()

  if (userSession.session) {
    return redirect("/dashboard")
  }

  return (
    <section className="max-w-dvw bg-arctic-gradient relative w-full overflow-hidden pb-16">
      <div className="container mx-auto flex flex-col items-center space-y-16 px-4 py-8 sm:pb-24 sm:pt-16">
        <div className="mx-auto flex w-full flex-col items-center gap-y-12 px-4 md:px-6 lg:px-8">
          <h1 className="text-center text-4xl font-extrabold leading-tight tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
            Onyx SaaS PWA Template
          </h1>

          {/* The PrismContainer uses dynamic client-side rendering to display the FeaturesAnimation component. I wanted to demo the usage of Fibonacci's Golden Ratio in an interactive 3D component for devs who may be interested in expanding upon the general concept of the animation. Theres a working implementation running NextJS 15 and React 19 at github.com/rmourey26/3d-prism-infographic and 3d-prism-infographic.vercel.app. The Onyx version needs some tinkering to work properly with React 18.3. I should be able to get that done by 05-10-2025. We'll see.
        <PrismContainer />
      */}
          <p className="xs:text-justify max-w-3xl text-lg text-muted-foreground lg:text-xl">
            Secure user authentication + RBAC, Zod validated Supabase Postgres DB CRUD ops, Rust serverless API runtime, TanStack queries with Supabase cache helpers, Resend, SID.ai, NextMDX, admin dashboard, and more. Onboard users and receive inquiries immediately.
          </p>
        </div>
        <Cta />
        <div className="mb-8 flex gap-6">
          <Link href={siteConfig.links.login} target="_blank" rel="noreferrer" className={buttonVariants()}>
            Login
          </Link>
          <Link
            target="_blank"
            rel="noreferrer"
            href={siteConfig.links.signup}
            className={buttonVariants({ variant: "outline" })}
          >
            Sign Up
          </Link>
        </div>
      </div>
      <AnimatedInfographic />
      <Featurez />
      <WhyOnyxWrapper />
    </section>
  )
}
