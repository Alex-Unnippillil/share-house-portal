export default function FeatureSettingsLoading() {
  return (
    <div className="container max-w-4xl space-y-8 py-10">
      <div className="space-y-3">
        <div className="h-10 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-lg border border-border/60 bg-background p-6 shadow-sm"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="h-5 w-40 animate-pulse rounded-md bg-muted" />
                <div className="h-4 w-64 animate-pulse rounded-md bg-muted" />
              </div>
              <div className="h-6 w-12 animate-pulse rounded-full bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
