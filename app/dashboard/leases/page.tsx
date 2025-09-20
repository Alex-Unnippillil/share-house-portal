import Link from "next/link"

import { format } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"

import {
  getLeaseManagementData,
  saveLeaseDocument,
  type LeaseManagementSummary,
} from "./actions"

function formatDisplayDate(dateString: string | null): string {
  if (!dateString) {
    return "Not set"
  }

  const parsed = new Date(dateString)
  if (Number.isNaN(parsed.getTime())) {
    return dateString
  }

  return format(parsed, "PPP")
}

function isExpired(expirationDate: string | null): boolean {
  if (!expirationDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expires = new Date(expirationDate)
  expires.setHours(0, 0, 0, 0)
  return expires < today
}

export default async function DashboardLeaseDocumentsPage() {
  let leases: LeaseManagementSummary = []

  try {
    leases = await getLeaseManagementData()
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "You do not have access to the lease management area."

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Lease documents</h1>
          <p className="text-muted-foreground">
            Property staff can upload agreements and distribute new versions from this
            dashboard.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild variant="outline">
              <Link href="/">Return home</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Lease documents</h1>
        <p className="text-muted-foreground">
          Upload resident agreements, track version history, and replace expiring files. Tenants can
          download their latest agreements from the{" "}
          <Link href="/leases" className="underline">
            tenant lease portal
          </Link>
          .
        </p>
      </div>

      <div className="grid gap-6">
        {leases.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No leases configured</CardTitle>
              <CardDescription>
                Create leases in Supabase and associate residents to begin managing documents.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          leases.map((lease) => (
            <Card key={lease.id}>
              <CardHeader className="space-y-2">
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <span>{lease.label}</span>
                  <Badge variant="outline" className="uppercase tracking-wide">
                    {lease.status ?? "active"}
                  </Badge>
                </CardTitle>
                <CardDescription className="space-y-1">
                  <div>
                    Resident:{" "}
                    {lease.tenant ? (
                      <span className="font-medium">
                        {lease.tenant.full_name ?? lease.tenant.email ?? "Unknown"}
                      </span>
                    ) : (
                      <span className="font-medium">Unassigned</span>
                    )}
                    {lease.tenant?.email ? (
                      <span className="text-muted-foreground"> · {lease.tenant.email}</span>
                    ) : null}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {lease.property_address ? `${lease.property_address} · ` : ""}
                    Starts {formatDisplayDate(lease.start_date)}
                    {lease.end_date ? ` · Ends ${formatDisplayDate(lease.end_date)}` : ""}
                  </div>
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-8">
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase text-muted-foreground">
                      Current documents
                    </h2>
                  </div>

                  {lease.lease_documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No lease documents have been uploaded yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {lease.lease_documents.map((doc) => {
                        const expired = isExpired(doc.expiration_date)

                        return (
                          <div key={doc.id} className="rounded-lg border p-4">
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                              <div className="space-y-1">
                                <p className="font-medium leading-tight">{doc.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  Version {doc.version} · Effective {formatDisplayDate(doc.effective_date)}
                                  {doc.expiration_date
                                    ? ` · Expires ${formatDisplayDate(doc.expiration_date)}`
                                    : ""}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={expired ? "destructive" : "secondary"}>
                                  {expired ? "Expired" : "Active"}
                                </Badge>
                                {doc.signedUrl ? (
                                  <Button asChild size="sm" variant="outline">
                                    <a
                                      href={doc.signedUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      Download
                                    </a>
                                  </Button>
                                ) : null}
                              </div>
                            </div>

                            <form
                              action={saveLeaseDocument}
                              encType="multipart/form-data"
                              className="mt-4 grid gap-3 md:grid-cols-2"
                            >
                              <input type="hidden" name="leaseId" value={lease.id} />
                              <input type="hidden" name="documentId" value={doc.id} />
                              <label className="flex flex-col gap-1 text-sm">
                                <span className="font-medium">Title</span>
                                <Input
                                  name="title"
                                  defaultValue={doc.title}
                                  required
                                  placeholder="Resident lease agreement"
                                />
                              </label>

                              <label className="flex flex-col gap-1 text-sm">
                                <span className="font-medium">Version</span>
                                <Input
                                  name="version"
                                  defaultValue={doc.version}
                                  required
                                  placeholder="v1.0"
                                />
                              </label>

                              <label className="flex flex-col gap-1 text-sm">
                                <span className="font-medium">Effective date</span>
                                <Input
                                  type="date"
                                  name="effectiveDate"
                                  defaultValue={doc.effective_date ?? undefined}
                                  required
                                />
                              </label>

                              <label className="flex flex-col gap-1 text-sm">
                                <span className="font-medium">Expiration date</span>
                                <Input
                                  type="date"
                                  name="expirationDate"
                                  defaultValue={doc.expiration_date ?? undefined}
                                />
                              </label>

                              <label className="flex flex-col gap-1 text-sm md:col-span-2">
                                <span className="font-medium">Replace PDF (optional)</span>
                                <Input type="file" name="file" accept="application/pdf" />
                                <span className="text-xs text-muted-foreground">
                                  Leave blank to keep the current file.
                                </span>
                              </label>

                              <div className="md:col-span-2">
                                <Button type="submit">Save changes</Button>
                              </div>
                            </form>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </section>

                <section className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase text-muted-foreground">
                    Upload a new version
                  </h2>
                  <form
                    action={saveLeaseDocument}
                    encType="multipart/form-data"
                    className="grid gap-3 md:grid-cols-2"
                  >
                    <input type="hidden" name="leaseId" value={lease.id} />

                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium">Title</span>
                      <Input name="title" placeholder="Lease agreement" required />
                    </label>

                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium">Version</span>
                      <Input name="version" placeholder="v2.0" required />
                    </label>

                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium">Effective date</span>
                      <Input type="date" name="effectiveDate" required />
                    </label>

                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium">Expiration date</span>
                      <Input type="date" name="expirationDate" />
                    </label>

                    <label className="flex flex-col gap-1 text-sm md:col-span-2">
                      <span className="font-medium">PDF file</span>
                      <Input type="file" name="file" accept="application/pdf" required />
                      <span className="text-xs text-muted-foreground">
                        Only PDF documents up to 10 MB are supported.
                      </span>
                    </label>

                    <div className="flex items-center gap-2 md:col-span-2">
                      <Button type="submit">Upload document</Button>
                    </div>
                  </form>
                </section>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
