import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function RentSummarySkeleton() {
  return (
    <Card data-testid="rent-summary-skeleton" className="animate-pulse">
      <CardHeader>
        <CardTitle className="h-5 w-32 rounded bg-muted" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-4 w-16 rounded bg-muted" />
        <div className="h-8 w-24 rounded bg-muted" />
        <div className="h-4 w-20 rounded bg-muted" />
        <div className="h-8 w-24 rounded bg-muted" />
      </CardContent>
    </Card>
  )
}

export function LatestDocumentsSkeleton() {
  return (
    <Card data-testid="latest-documents-skeleton" className="animate-pulse">
      <CardHeader>
        <CardTitle className="h-5 w-36 rounded bg-muted" />
      </CardHeader>
      <CardContent className="space-y-2">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="h-4 w-48 rounded bg-muted" />
        ))}
        <div className="h-8 w-24 rounded bg-muted" />
      </CardContent>
    </Card>
  )
}

export function RoommateBoardSkeleton() {
  return (
    <Card data-testid="roommate-board-skeleton" className="animate-pulse">
      <CardHeader>
        <CardTitle className="h-5 w-40 rounded bg-muted" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[...Array(2)].map((_, index) => (
          <div key={index} className="h-4 w-full rounded bg-muted" />
        ))}
        <div className="h-8 w-32 rounded bg-muted" />
      </CardContent>
    </Card>
  )
}
