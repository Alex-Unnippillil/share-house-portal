'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useMaintenanceRequests, useUpdateMaintenanceStatus } from './hooks'

const statusOrder = ['pending', 'in_progress', 'resolved'] as const
const statusLabels: Record<(typeof statusOrder)[number], string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  resolved: 'Resolved',
}

const priorityVariant: Record<'low' | 'medium' | 'high', 'secondary' | 'default' | 'destructive'> = {
  low: 'secondary',
  medium: 'default',
  high: 'destructive',
}

const nextStatus = (current: (typeof statusOrder)[number]) => {
  const currentIndex = statusOrder.indexOf(current)
  return currentIndex === -1 ? undefined : statusOrder[currentIndex + 1]
}

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))

export const MaintenanceManagement = () => {
  const { data, isLoading, isError, error } = useMaintenanceRequests()
  const updateStatus = useUpdateMaintenanceStatus()

  const handleAdvance = (id: string, currentStatus: (typeof statusOrder)[number]) => {
    const status = nextStatus(currentStatus)
    if (!status) {
      return
    }

    updateStatus.mutate({ id, status })
  }

  return (
    <section aria-labelledby="maintenance-management-heading" className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle id="maintenance-management-heading" className="text-xl">
            Maintenance management
          </CardTitle>
          <CardDescription>
            Review open requests, track progress, and mark work orders once they are complete.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
              Loading maintenance requests…
            </p>
          ) : isError ? (
            <p role="alert" className="text-sm text-destructive">
              {(error as Error).message || 'Unable to retrieve maintenance requests.'}
            </p>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All caught up! There are no outstanding maintenance requests.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <table className="min-w-full divide-y divide-border" aria-describedby="maintenance-management-heading">
                <thead className="bg-muted/40">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Request
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Priority
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Updated
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card text-sm">
                  {data.map(request => (
                    <tr key={request.id}>
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-foreground">{request.title}</div>
                        <div className="text-xs text-muted-foreground">
                          Unit {request.unit} · Created {formatDateTime(request.createdAt)}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{request.details}</p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Badge variant={priorityVariant[request.priority]} className="capitalize">
                          {request.priority} priority
                        </Badge>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={cn('inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold', {
                            'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200': request.status === 'pending',
                            'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200': request.status === 'in_progress',
                            'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200': request.status === 'resolved',
                          })}
                        >
                          {statusLabels[request.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                        {formatDateTime(request.updatedAt ?? request.createdAt)}
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        {request.status === 'resolved' ? (
                          <span className="text-xs font-medium text-emerald-600">Completed</span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAdvance(request.id, request.status)}
                            disabled={updateStatus.isPending}
                          >
                            Mark as {statusLabels[nextStatus(request.status) ?? request.status]}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {updateStatus.isError && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {(updateStatus.error as Error)?.message || 'Unable to update the maintenance request at this time.'}
            </p>
          )}
          {updateStatus.isSuccess && (
            <p role="status" aria-live="polite" className="mt-3 text-sm text-emerald-600">
              Maintenance request updated successfully.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
