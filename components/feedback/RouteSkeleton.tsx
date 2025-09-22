export function RouteSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="space-y-6 rounded-lg border border-border/40 bg-background/40 p-6"
    >
      <div className="space-y-3">
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded-lg bg-muted/80" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-xl border border-border/40 bg-muted/60"
          />
        ))}
      </div>
      <span className="sr-only">Loading content…</span>
    </div>
  )
}
