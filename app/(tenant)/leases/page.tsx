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

import { getTenantLeaseDocuments } from "@/app/dashboard/leases/actions"

function formatDate(value: string | null, fallback = "Not set") {
  if (!value) {
    return fallback
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return fallback
  }

  return format(parsed, "PPP")
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Unknown"
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return format(parsed, "PPP p")
}

function hasExpired(expirationDate: string | null) {
  if (!expirationDate) {
    return false
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const expires = new Date(expirationDate)
  expires.setHours(0, 0, 0, 0)

  return expires < today
}

export default async function TenantLeasePage() {
  const documents = await getTenantLeaseDocuments()

  const grouped = new Map<
    string,
    {
      leaseId: string
      leaseLabel: string
      propertyAddress: string | null
      leaseStartDate: string | null
      leaseEndDate: string | null
      documents: typeof documents
    }
  >()

  documents.forEach((doc) => {
    const existing = grouped.get(doc.leaseId)
    if (existing) {
      existing.documents.push(doc)
    } else {
      grouped.set(doc.leaseId, {
        leaseId: doc.leaseId,
        leaseLabel: doc.leaseLabel,
        propertyAddress: doc.propertyAddress,
        leaseStartDate: doc.leaseStartDate,
        leaseEndDate: doc.leaseEndDate,
        documents: [doc],
      })
    }
  })

  const leases = Array.from(grouped.values()).map((entry) => ({
    ...entry,
    documents: [...entry.documents].sort((a, b) => {
      const aDate = new Date(a.effectiveDate).getTime()
      const bDate = new Date(b.effectiveDate).getTime()
      return bDate - aDate
    }),
  }))

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">My lease agreements</h1>
        <p className="text-muted-foreground">
          Download signed agreements, review current versions, and confirm upcoming renewals.
        </p>
      </div>

      {leases.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No documents available</CardTitle>
            <CardDescription>
              When your property manager uploads a lease agreement it will appear here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6">
          {leases.map((lease) => (
            <Card key={lease.leaseId} className="border-muted">
              <CardHeader className="space-y-1">
                <CardTitle>{lease.leaseLabel}</CardTitle>
                <CardDescription>
                  {lease.propertyAddress ? `${lease.propertyAddress} · ` : ""}
                  Active from {formatDate(lease.leaseStartDate)}
                  {lease.leaseEndDate ? ` · Ends ${formatDate(lease.leaseEndDate)}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {lease.documents.map((doc) => {
                  const expired = hasExpired(doc.expirationDate)

                  return (
                    <div
                      key={doc.id}
                      className="rounded-lg border border-dashed p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                          <h3 className="text-base font-semibold">{doc.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Version {doc.version} · Effective {formatDate(doc.effectiveDate)}
                            {doc.expirationDate ? ` · Expires ${formatDate(doc.expirationDate)}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Last updated {formatDateTime(doc.updatedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={expired ? "destructive" : "secondary"}>
                            {expired ? "Expired" : "Active"}
                          </Badge>
                          <Badge variant="outline">v{doc.version}</Badge>
                        </div>
                      </div>

                      <CardFooter className="mt-4 flex flex-wrap items-center gap-3 p-0">
                        {doc.signedUrl ? (
                          <Button asChild>
                            <a
                              href={doc.signedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Download PDF
                            </a>
                          </Button>
                        ) : (
                          <Button variant="outline" disabled>
                            Download PDF
                          </Button>
                        )}
                        {!doc.signedUrl ? (
                          <span className="text-xs text-muted-foreground">
                            Contact your property manager if the download link is unavailable.
                          </span>
                        ) : null}
                      </CardFooter>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
