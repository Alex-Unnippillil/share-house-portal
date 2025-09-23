import { Suspense } from "react"

import { Separator } from "@/components/ui/separator"

import { MessagingThreadsShell } from "./_components/messaging-threads-shell"
import { MessagingThreadsSkeleton } from "./_components/messaging-threads-skeleton"

export default function MessagingPage() {
  return (
    <div className="container max-w-6xl space-y-10 py-12">
      <header className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Messaging</h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Organize roommate discussions by topic, capture reactions, and close the loop on decisions with polls and shared attachments.
          </p>
        </div>
        <Separator />
      </header>

      <Suspense fallback={<MessagingThreadsSkeleton />}>
        <MessagingThreadsShell />
      </Suspense>
    </div>
  )
}
