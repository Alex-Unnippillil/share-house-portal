import { Separator } from "@/components/ui/separator"

import { MessagingThreadsSkeleton } from "./_components/messaging-threads-skeleton"

export default function Loading() {
  return (
    <div className="container max-w-6xl space-y-10 py-12">
      <header className="space-y-4">
        <div className="space-y-2">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" aria-hidden />
          <div className="h-4 w-96 animate-pulse rounded bg-muted/80" aria-hidden />
        </div>
        <Separator className="animate-pulse bg-muted/60" />
      </header>
      <MessagingThreadsSkeleton />
    </div>
  )
}
