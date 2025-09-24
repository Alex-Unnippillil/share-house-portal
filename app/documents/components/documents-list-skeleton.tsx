import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface DocumentsListSkeletonProps {
  rows?: number
}

export function DocumentsListSkeleton({ rows = 4 }: DocumentsListSkeletonProps) {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      {Array.from({ length: rows }).map((_, index) => (
        <Card key={index} className="border-border/60 bg-muted/20">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-5 w-48 animate-pulse rounded bg-muted" aria-hidden />
                <div className="h-4 w-32 animate-pulse rounded bg-muted/70" aria-hidden />
              </div>
              <div className="h-6 w-20 animate-pulse rounded-full bg-muted/60" aria-hidden />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="h-4 w-24 animate-pulse rounded bg-muted/70" aria-hidden />
              <div className="flex gap-2">
                {Array.from({ length: 2 }).map((__, pillIndex) => (
                  <div
                    key={pillIndex}
                    className="h-8 w-16 animate-pulse rounded-full border border-border/60 bg-muted/40"
                    aria-hidden
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <span className="sr-only">Loading documents…</span>
    </div>
  )
}
