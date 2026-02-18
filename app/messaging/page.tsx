import { Suspense } from "react"

import {
  PageContainer,
  PageDescription,
  PageHeader,
  PageTitle,
} from "@/components/ui/page-layout"

import { MessagingThreadsShell } from "./_components/messaging-threads-shell"
import { MessagingThreadsSkeleton } from "./_components/messaging-threads-skeleton"

export default function MessagingPage() {
  return (
    <PageContainer className="max-w-6xl">
      <PageHeader>
        <PageTitle>Messaging</PageTitle>
        <PageDescription>
          Organize roommate discussions by topic, capture reactions, and close
          the loop on decisions with polls and shared attachments.
        </PageDescription>
      </PageHeader>

      <Suspense fallback={<MessagingThreadsSkeleton />}>
        <MessagingThreadsShell />
      </Suspense>
    </PageContainer>
  )
}
