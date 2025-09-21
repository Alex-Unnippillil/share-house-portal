'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAcknowledgePackage, usePackagesList } from './hooks'

const statusLabels = {
  awaiting_pickup: 'Awaiting pickup',
  picked_up: 'Picked up',
} as const

const formatReceivedAt = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))

export const PackagesList = () => {
  const { data, isLoading, isError, error } = usePackagesList()
  const acknowledgePackage = useAcknowledgePackage()

  const handleAcknowledge = (id: string) => {
    acknowledgePackage.mutate({ id })
  }

  return (
    <Card aria-labelledby="packages-heading">
      <CardHeader>
        <CardTitle id="packages-heading" className="text-xl">
          Package deliveries
        </CardTitle>
        <CardDescription>Monitor recent deliveries and confirm when you have collected them.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
            Loading packages…
          </p>
        ) : isError ? (
          <p role="alert" className="text-sm text-destructive">
            {(error as Error).message || 'Unable to load package information.'}
          </p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No deliveries are waiting at this time.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left">
                    Carrier & tracking
                  </th>
                  <th scope="col" className="px-4 py-3 text-left">
                    Received
                  </th>
                  <th scope="col" className="px-4 py-3 text-left">
                    Location
                  </th>
                  <th scope="col" className="px-4 py-3 text-left">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {data.map(pkg => (
                  <tr key={pkg.id}>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-foreground">{pkg.carrier}</div>
                      <div className="text-xs text-muted-foreground">Tracking #{pkg.trackingNumber}</div>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                      {formatReceivedAt(pkg.receivedAt)}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-muted-foreground">{pkg.location}</td>
                    <td className="px-4 py-3 align-top">
                      <Badge
                        variant={pkg.status === 'awaiting_pickup' ? 'default' : 'complete'}
                        className="capitalize"
                      >
                        {statusLabels[pkg.status]}
                      </Badge>
                      {pkg.notes && <p className="mt-2 text-xs text-muted-foreground">{pkg.notes}</p>}
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      {pkg.status === 'picked_up' ? (
                        <span className="text-xs font-medium text-emerald-600">Confirmed</span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAcknowledge(pkg.id)}
                          disabled={acknowledgePackage.isPending}
                          aria-label={`Mark package ${pkg.trackingNumber} as picked up`}
                        >
                          Mark picked up
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {acknowledgePackage.isError && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {(acknowledgePackage.error as Error)?.message || 'Unable to update the package status.'}
          </p>
        )}
        {acknowledgePackage.isSuccess && (
          <p role="status" aria-live="polite" className="mt-3 text-sm text-emerald-600">
            Package status updated successfully.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
