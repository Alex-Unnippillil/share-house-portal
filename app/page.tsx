import Link from "next/link"
import { redirect } from "next/navigation"
import { readUserSession } from "@/utils/actions"

import { siteConfig } from "@/config/site"
import { buttonVariants } from "@/components/ui/button"

export default async function IndexPage() {
  const { data: userSession } = await readUserSession()

  if (userSession.session) {
    return redirect("/dashboard")
  }
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            Shared living made simple
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Pay rent, reserve shared amenities, keep track of documents, and message roommates — all in one secure portal.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            <Link href={siteConfig.links.login} className={buttonVariants({ size: "lg" })}>
              Sign In
            </Link>
            <Link
              href={siteConfig.links.signup}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Get Started
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 pt-10 sm:grid-cols-2 lg:grid-cols-4 text-left">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="font-semibold">Rent payments</h3>
              <p className="text-sm text-muted-foreground">Autopay or one‑time. Clear receipts.</p>
              <Link href="/payments" className="text-sm underline">Open payments</Link>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-semibold">Documents</h3>
              <p className="text-sm text-muted-foreground">Leases and files in one place.</p>
              <Link href="/documents" className="text-sm underline">View documents</Link>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="font-semibold">Messaging</h3>
              <p className="text-sm text-muted-foreground">Keep everyone in sync.</p>
              <Link href="/messaging" className="text-sm underline">Open board</Link>
            </div>
          </div>

          <div className="max-w-3xl mx-auto pt-12">
            <h2 className="text-lg font-semibold mb-4">How it works</h2>
            <ol className="grid gap-3 sm:grid-cols-3 text-sm text-left">
              <li>
                <span className="font-medium">1. Sign in</span>
                <div className="text-muted-foreground">Create your account and join your unit.</div>
              </li>
              <li>
                <span className="font-medium">2. Set up</span>
                <div className="text-muted-foreground">Add payment method and invite roommates.</div>
              </li>
              <li>
                <span className="font-medium">3. Go</span>
                <div className="text-muted-foreground">Pay rent, book amenities, and share docs.</div>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
