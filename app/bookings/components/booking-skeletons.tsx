import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function BookingStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="border-border/40 bg-background/60">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
