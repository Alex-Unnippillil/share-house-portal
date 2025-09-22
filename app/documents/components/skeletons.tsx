import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function DocumentsStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4" data-testid="documents-stats-skeleton">
      {[...Array(4)].map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardHeader className="pb-2">
            <div className="h-4 w-3/4 rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-1/2 rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

type DocumentsListSkeletonVariant = 'all' | 'leases' | 'pending' | 'signed'

const variantAccents: Record<DocumentsListSkeletonVariant, string> = {
  all: 'w-48',
  leases: 'w-40',
  pending: 'w-36',
  signed: 'w-32',
}

export function DocumentsListSkeleton({ variant }: { variant: DocumentsListSkeletonVariant }) {
  const accentWidth = variantAccents[variant]

  return (
    <div className="space-y-4" data-testid={`documents-list-skeleton-${variant}`}>
      {[...Array(4)].map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className={`h-5 ${accentWidth} rounded bg-muted`} />
                <div className="h-4 w-32 rounded bg-muted" />
              </div>
              <div className="h-6 w-20 rounded bg-muted" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="flex space-x-2">
                <div className="h-8 w-16 rounded bg-muted" />
                <div className="h-8 w-16 rounded bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
