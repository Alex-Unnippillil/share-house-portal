import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DocumentActions } from "./document-actions"
import { DocumentListFilters, DocumentWithLease } from "@/types/documents"
import { fetchDocuments } from "@/lib/data/documents"
import { formatDistanceToNow } from "date-fns"
import { FileText, Users, Calendar, Eye } from "lucide-react"

interface DocumentsListProps {
  filter: DocumentListFilters
}

function getStatusBadge(status: string) {
  const variants = {
    draft: "secondary",
    pending_signature: "outline",
    signed: "default",
    expired: "destructive",
    cancelled: "secondary",
  } as const

  const labels = {
    draft: "Draft",
    pending_signature: "Pending Signature",
    signed: "Signed",
    expired: "Expired",
    cancelled: "Cancelled",
  }

  return (
    <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
      {labels[status as keyof typeof labels] || status}
    </Badge>
  )
}

function getTypeIcon(type: string) {
  switch (type) {
    case "lease":
      return <FileText className="size-4" />
    case "addendum":
      return <FileText className="size-4" />
    case "insurance":
      return <Users className="size-4" />
    default:
      return <FileText className="size-4" />
  }
}

function renderEmptyState(filter: DocumentListFilters) {
  return (
    <Card className="p-12">
      <div className="text-center">
        <FileText className="mx-auto mb-4 size-12 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-medium">No documents found</h3>
        <p className="text-sm text-muted-foreground">
          {Object.keys(filter).length > 0
            ? "No documents match your current filters."
            : "Get started by uploading your first document."}
        </p>
      </div>
    </Card>
  )
}

function renderErrorState(message: string) {
  return (
    <Card className="p-6">
      <div className="text-center">
        <p className="mb-2 text-destructive">Error loading documents</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </Card>
  )
}

export async function DocumentsList({ filter }: DocumentsListProps) {
  let documents: DocumentWithLease[] = []

  try {
    documents = await fetchDocuments(filter || {})
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch documents."
    return renderErrorState(message)
  }

  if (documents.length === 0) {
    return renderEmptyState(filter)
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <Card key={doc.id} className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="mt-1">{getTypeIcon(doc.document_type)}</div>
                <div className="space-y-1">
                  <h3 className="font-medium leading-none">{doc.title}</h3>
                  {doc.description && (
                    <p className="text-sm text-muted-foreground">{doc.description}</p>
                  )}
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Calendar className="size-3" />
                      <span>
                        {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {doc.lease && (
                      <div className="flex items-center space-x-1">
                        <Users className="size-3" />
                        <span>Lease • {doc.lease.tenant_ids?.length || 0} tenants</span>
                      </div>
                    )}
                    {doc.signatures && doc.signatures.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <Eye className="size-3" />
                        <span>
                          {doc.signatures.filter((s) => s.status === "signed").length}/
                          {doc.signatures.length} signed
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusBadge(doc.status)}
                <DocumentActions document={doc} />
              </div>
            </div>
          </CardHeader>
          {doc.signatures && doc.signatures.length > 0 && (
            <CardContent className="pt-0">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">Signers:</span>
                {doc.signatures.slice(0, 3).map((signature) => (
                  <Badge
                    key={signature.id}
                    variant={signature.status === "signed" ? "default" : "outline"}
                    className="text-xs"
                  >
                    {signature.signer_name || signature.signer_email}
                  </Badge>
                ))}
                {doc.signatures.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{doc.signatures.length - 3} more
                  </span>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}
