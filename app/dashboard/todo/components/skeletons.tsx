export function TodoListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-8 animate-pulse rounded bg-muted/40" />
      ))}
    </div>
  )
}
