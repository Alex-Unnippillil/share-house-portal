import { Suspense } from "react"

import { PageShell } from "@/components/layout/page-shell"

import { MessagingThreadsShell } from "./_components/messaging-threads-shell"
import { MessagingThreadsSkeleton } from "./_components/messaging-threads-skeleton"

export default function MessagingPage() {
  return (
    <PageShell
      title="Messaging"
      description="Organize roommate discussions by topic, capture reactions, and close the loop on decisions with polls and shared attachments."
      maxWidthClassName="max-w-6xl"
    >

      <Suspense fallback={<MessagingThreadsSkeleton />}>
        <MessagingThreadsShell />
      </Suspense>
    </PageShell>
  )
}
