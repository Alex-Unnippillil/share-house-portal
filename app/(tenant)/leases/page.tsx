import { format } from 'date-fns'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { listTenantLeaseDocuments } from '@/app/dashboard/leases/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function formatDate(value: string | null): string {
  if (!value) return '—'
  try {
    return format(new Date(value), 'MMM d, yyyy')
  } catch (error) {
    return value
  }
}

export default async function TenantLeasesPage() {
  const { data: documents, error, unauthorized, requiresAuth } = await listTenantLeaseDocuments()

  if (requiresAuth) {
    redirect('/auth')
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Lease agreements</h1>
        <p className="text-muted-foreground">
          Review your current lease agreements and download signed copies for your records.
        </p>
      </div>
      {unauthorized ? (
        <Card>
          <CardHeader>
            <CardTitle>Access restricted</CardTitle>
            <CardDescription>
              You do not have permission to view lease agreements with this account.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Available documents</CardTitle>
            <CardDescription>
              Documents are available for download for 60 minutes after each link is generated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No lease documents are currently available. Please contact property staff if you
                believe this is incorrect.
              </p>
            ) : (
              <div className="space-y-4">
                {documents.map((document) => {
                  const isExpired = document.expiration_date
                    ? new Date(document.expiration_date) < new Date()
                    : false

                  return (
                    <div
                      key={document.id}
                      className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{document.title}</span>
                          <Badge variant="outline">v{document.version}</Badge>
                          {isExpired ? <Badge variant="destructive">Expired</Badge> : null}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Effective {formatDate(document.effective_date)}
                          {document.expiration_date
                            ? ` · Expires ${formatDate(document.expiration_date)}`
                            : ''}
                        </p>
                        {document.lease ? (
                          <p className="text-sm text-muted-foreground">
                            {document.lease.property_name} · {document.lease.unit_label}
                          </p>
                        ) : null}
                      </div>
                      {document.downloadUrl ? (
                        <Button asChild>
                          <Link href={document.downloadUrl} target="_blank" rel="noopener noreferrer">
                            Download PDF
                          </Link>
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">Download unavailable</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
