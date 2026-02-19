import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

import { DocumentsListSkeleton } from "./components/documents-list-skeleton"

export default function Loading() {
  return (
    <div className="container max-w-7xl space-y-8 py-8">
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" aria-hidden />
            <div className="h-4 w-96 animate-pulse rounded bg-muted/80" aria-hidden />
          </div>
          <div className="h-10 w-36 animate-pulse rounded-lg bg-muted/70" aria-hidden />
        </div>
        <Separator className="animate-pulse bg-muted/60" />
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border-border/60 bg-muted/20" role="status" aria-live="polite">
            <CardHeader className="space-y-3 pb-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" aria-hidden />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-1/2 animate-pulse rounded bg-muted/80" aria-hidden />
            </CardContent>
          </Card>
        ))}
      </div>

      <DocumentsListSkeleton rows={4} />
    </div>
  )
}
