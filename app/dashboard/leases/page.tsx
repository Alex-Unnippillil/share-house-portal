import { format } from 'date-fns'

import {
  fetchLeaseOverview,
  uploadLeaseDocument,
  type LeaseDocumentWithUrl,
} from './actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function formatDate(value: string | null): string {
  if (!value) return '—'
  try {
    return format(new Date(value), 'MMM d, yyyy')
  } catch (error) {
    return value
  }
}

type LeaseDocumentFormProps = {
  leaseId: string
  document?: LeaseDocumentWithUrl
}

function LeaseDocumentForm({ leaseId, document }: LeaseDocumentFormProps) {
  const formId = document ? `replace-${document.id}` : `new-${leaseId}`

  return (
    <form
      action={uploadLeaseDocument}
      className="grid gap-3 rounded-lg border p-4"
      encType="multipart/form-data"
    >
      <input type="hidden" name="leaseId" value={leaseId} />
      {document ? <input type="hidden" name="documentId" value={document.id} /> : null}
      <div className="grid gap-1">
        <Label htmlFor={`${formId}-title`}>Document title</Label>
        <Input
          id={`${formId}-title`}
          name="title"
          defaultValue={document?.title ?? ''}
          placeholder="Signed lease agreement"
          required
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`${formId}-effective`}>Effective date</Label>
        <Input
          id={`${formId}-effective`}
          type="date"
          name="effectiveDate"
          defaultValue={document?.effective_date?.slice(0, 10) ?? ''}
          required
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`${formId}-expiration`}>Expiration date</Label>
        <Input
          id={`${formId}-expiration`}
          type="date"
          name="expirationDate"
          defaultValue={document?.expiration_date?.slice(0, 10) ?? ''}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`${formId}-file`}>PDF document</Label>
        <Input id={`${formId}-file`} type="file" name="file" accept="application/pdf" required />
        <p className="text-xs text-muted-foreground">Only PDF files are supported.</p>
      </div>
      <Button type="submit">{document ? 'Upload replacement' : 'Upload document'}</Button>
    </form>
  )
}

export default async function DashboardLeasesPage() {
  const { data: overview, error, unauthorized } = await fetchLeaseOverview()

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Lease documents</h1>
        <p className="text-muted-foreground">
          Upload new agreements, replace expiring documents, and provide tenants with the latest
          versions.
        </p>
      </div>
      {unauthorized ? (
        <Card>
          <CardHeader>
            <CardTitle>Access restricted</CardTitle>
            <CardDescription>Only property staff can manage lease documents.</CardDescription>
          </CardHeader>
        </Card>
      ) : overview.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No leases found</CardTitle>
            <CardDescription>
              Create leases in the database to begin attaching documents for tenants.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6">
          {error ? (
            <Card>
              <CardHeader>
                <CardTitle>Unable to load lease documents</CardTitle>
                <CardDescription>{error}</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            overview.map(({ lease, tenant, documents }) => {
              return (
                <Card key={lease.id} className="border">
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <CardTitle>
                          {lease.property_name} · {lease.unit_label}
                        </CardTitle>
                        <CardDescription>
                          Lease ID {lease.id}
                          {tenant ? ` · ${tenant.full_name ?? tenant.email ?? ''}` : ''}
                        </CardDescription>
                      </div>
                      <Badge variant={lease.status === 'active' ? 'default' : 'outline'}>
                        {lease.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Effective {formatDate(lease.start_date)}
                      {lease.end_date ? ` · Ends ${formatDate(lease.end_date)}` : ''}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      {documents.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No documents have been uploaded for this lease yet.
                        </p>
                      ) : (
                        documents.map((document) => {
                          const isExpired = document.expiration_date
                            ? new Date(document.expiration_date) < new Date()
                            : false

                          return (
                            <div key={document.id} className="space-y-3 rounded-lg border p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
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
                                </div>
                                {document.downloadUrl ? (
                                  <Button variant="secondary" asChild>
                                    <a
                                      href={document.downloadUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      Preview PDF
                                    </a>
                                  </Button>
                                ) : null}
                              </div>
                              <LeaseDocumentForm leaseId={lease.id} document={document} />
                            </div>
                          )
                        })
                      )}
                    </div>
                    <div className="space-y-2 rounded-lg border border-dashed p-4">
                      <div>
                        <h3 className="font-medium">Upload new document</h3>
                        <p className="text-sm text-muted-foreground">
                          Creating a new document automatically increments the version number for
                          this lease.
                        </p>
                      </div>
                      <LeaseDocumentForm leaseId={lease.id} />
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
