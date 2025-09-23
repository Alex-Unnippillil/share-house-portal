import { Skeleton } from "@/components/ui/skeleton"

export function MemberTableSkeleton() {
  return (
    <div className="space-y-2 rounded-md border border-dashed border-muted-foreground/30 p-4">
      <Skeleton className="h-6 w-32 rounded" />
      <div className="grid gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-10 rounded-md bg-muted/50" />
        ))}
      </div>
    </div>
  )
}
