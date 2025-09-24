import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

import { RoommateLedgerSkeleton } from "./_components/roommate-ledger-skeleton"

export default function Loading() {
  return (
    <div className="container max-w-5xl space-y-10 py-12">
      <header className="space-y-4">
        <div className="space-y-2">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" aria-hidden />
          <div className="h-4 w-80 animate-pulse rounded bg-muted/80" aria-hidden />
        </div>
        <Separator className="animate-pulse bg-muted/60" />
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="h-full" role="status" aria-live="polite">
            <CardHeader className="space-y-3">
              <CardTitle>
                <span className="block h-5 w-40 animate-pulse rounded bg-muted" aria-hidden />
              </CardTitle>
              <CardDescription>
                <span className="block h-3 w-56 animate-pulse rounded bg-muted/70" aria-hidden />
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {Array.from({ length: 3 }).map((__, lineIndex) => (
                <div key={lineIndex} className="h-3 w-full animate-pulse rounded bg-muted/60" aria-hidden />
              ))}
              <span className="sr-only">Loading payment highlight…</span>
            </CardContent>
          </Card>
        ))}
      </div>
      <RoommateLedgerSkeleton />
    </div>
  )
}
