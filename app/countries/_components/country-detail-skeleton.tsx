import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function CountryDetailSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      role="status"
      className="space-y-6"
    >
      <div className="space-y-3">
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-muted" aria-hidden />
        <div className="h-4 w-1/3 animate-pulse rounded-lg bg-muted/80" aria-hidden />
      </div>
      <Card className="border-border/40 bg-muted/10">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="h-5 w-40 animate-pulse rounded bg-muted" aria-hidden />
              <div className="h-4 w-24 animate-pulse rounded bg-muted/70" aria-hidden />
            </div>
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-9 w-20 animate-pulse rounded-full border border-border/40 bg-muted/60"
                  aria-hidden
                />
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-xl bg-muted/50" aria-hidden />
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-4 w-full animate-pulse rounded bg-muted/60" aria-hidden />
            ))}
          </div>
        </CardContent>
      </Card>
      <span className="sr-only">Loading country details…</span>
    </section>
  )
}
