import { Skeleton } from "@/components/ui/skeleton"

export function RouteSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="space-y-6 rounded-lg border border-border/40 bg-background/40 p-6"
    >
      <div className="space-y-3">
        <Skeleton className="h-8 w-2/3 rounded-lg" />
        <Skeleton className="h-4 w-1/2 rounded-lg bg-muted/70" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-32 rounded-xl border border-border/40 bg-muted/60"
          />
        ))}
      </div>
      <span className="sr-only">Loading content…</span>
    </div>
  )
}
