export default function LoadingRoles() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded bg-muted/60" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted/40" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-lg border bg-muted/30" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-lg border bg-muted/30" />
          ))}
        </div>
      </div>
    </div>
  );
}
