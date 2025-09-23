import { Skeleton } from "@/components/ui/skeleton"

export function TodoListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-8 w-full rounded bg-muted/50" />
      ))}
    </div>
  )
}
