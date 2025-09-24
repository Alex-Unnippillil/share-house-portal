import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export function RoommateLedgerSkeleton() {
  return (
    <Card role="status" aria-live="polite" className="space-y-8">
      <CardHeader className="space-y-3">
        <CardTitle>
          <span className="block h-6 w-40 animate-pulse rounded-lg bg-muted" aria-hidden />
        </CardTitle>
        <CardDescription>
          <span className="block h-4 w-72 animate-pulse rounded bg-muted/80" aria-hidden />
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {Array.from({ length: 3 }).map((_, roommateIndex) => (
          <div key={roommateIndex} className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" aria-hidden />
                <div className="h-3 w-24 animate-pulse rounded bg-muted/70" aria-hidden />
                <div className="h-3 w-36 animate-pulse rounded bg-muted/60" aria-hidden />
                <div className="h-3 w-32 animate-pulse rounded bg-muted/50" aria-hidden />
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="h-3 w-16 animate-pulse rounded bg-muted/60" aria-hidden />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" aria-hidden />
                <div className="h-3 w-32 animate-pulse rounded bg-muted/70" aria-hidden />
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border border-border/60">
              <div className="grid grid-cols-[110px_minmax(0,1fr)_140px_140px] gap-4 bg-muted/40 px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground sm:grid-cols-[120px_minmax(0,1fr)_150px_150px]">
                <span className="h-3 w-12 animate-pulse rounded bg-muted/70" aria-hidden />
                <span className="h-3 w-20 animate-pulse rounded bg-muted/70" aria-hidden />
                <span className="ml-auto h-3 w-14 animate-pulse rounded bg-muted/70" aria-hidden />
                <span className="ml-auto h-3 w-16 animate-pulse rounded bg-muted/70" aria-hidden />
              </div>
              <div className="divide-y divide-border/50">
                {Array.from({ length: 4 }).map((__, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="grid grid-cols-[110px_minmax(0,1fr)_140px_140px] gap-4 px-4 py-3 sm:grid-cols-[120px_minmax(0,1fr)_150px_150px]"
                    aria-hidden
                  >
                    <div className="space-y-1">
                      <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-14 animate-pulse rounded bg-muted/70" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-40 animate-pulse rounded bg-muted/70" />
                      <div className="h-3 w-24 animate-pulse rounded bg-muted/60" />
                    </div>
                    <div className="ml-auto flex flex-col items-end gap-2">
                      <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                      <div className="h-5 w-20 animate-pulse rounded-full border border-dashed border-border/60 bg-muted/40" />
                    </div>
                    <div className="ml-auto space-y-2 text-right">
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-24 animate-pulse rounded bg-muted/70" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {roommateIndex < 2 ? <Separator /> : null}
          </div>
        ))}
        <span className="sr-only">Loading roommate ledger…</span>
      </CardContent>
    </Card>
  )
}
