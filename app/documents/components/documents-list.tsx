"use client"

import { useEffect, useMemo, useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { formatDistanceToNow } from "date-fns"
import { Calendar, FileText, Users } from "lucide-react"

import Table from "@/components/ui/Table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import { DocumentListFilters, DocumentWithLease } from "@/types/documents"

import { getDocumentsAction } from "../actions"
import { DocumentActions } from "./document-actions"

interface DocumentsListProps {
  filter: DocumentListFilters
}

const statusVariants = {
  draft: "secondary" as const,
  pending_signature: "outline" as const,
  signed: "default" as const,
  expired: "destructive" as const,
  cancelled: "secondary" as const,
}

const statusLabels: Record<string, string> = {
  draft: "Draft",
  pending_signature: "Pending Signature",
  signed: "Signed",
  expired: "Expired",
  cancelled: "Cancelled",
}

function getStatusBadge(status: string) {
  const variant = statusVariants[status as keyof typeof statusVariants] || "secondary"
  const label = statusLabels[status] || status

  return <Badge variant={variant}>{label}</Badge>
}

function getTypeIcon(type: string) {
  switch (type) {
    case "lease":
      return <FileText className="size-4 text-primary" />
    case "addendum":
      return <FileText className="size-4 text-primary" />
    case "insurance":
      return <Users className="size-4 text-primary" />
    default:
      return <FileText className="size-4 text-primary" />
  }
}

export function DocumentsList({ filter }: DocumentsListProps) {
  const [documents, setDocuments] = useState<DocumentWithLease[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await getDocumentsAction(filter)
        if (result.success && result.data) {
          setDocuments(result.data)
          setError(null)
        } else {
          setError(result.error || "Failed to fetch documents")
        }
      } catch (err) {
        console.error("Error fetching documents:", err)
        setError("An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchDocuments()
  }, [filter])

  const columns = useMemo<ColumnDef<DocumentWithLease>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Document",
        cell: ({ row }) => {
          const doc = row.original
          const createdLabel = formatDistanceToNow(new Date(doc.created_at), {
            addSuffix: true,
          })

          return (
            <div className="flex gap-3">
              <div className="mt-1 flex items-start">{getTypeIcon(doc.document_type)}</div>
              <div className="space-y-1">
                <p className="font-medium leading-tight text-foreground">{doc.title}</p>
                {doc.description ? (
                  <p className="text-sm text-muted-foreground">{doc.description}</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    Created {createdLabel}
                  </span>
                  {doc.lease ? (
                    <span className="flex items-center gap-1">
                      <Users className="size-3" />
                      Lease · {doc.lease.tenant_ids?.length || 0} tenants
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          )
        },
        size: 420,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => getStatusBadge(row.original.status),
        size: 160,
        meta: {
          cellClassName: "whitespace-nowrap",
        },
      },
      {
        id: "signers",
        header: "Signers",
        cell: ({ row }) => {
          const signatures = row.original.signatures
          if (!signatures || signatures.length === 0) {
            return <span className="text-sm text-muted-foreground">—</span>
          }

          const signedCount = signatures.filter((signature) => signature.status === "signed").length

          return (
            <span className="text-sm text-muted-foreground">
              {signedCount}/{signatures.length} signed
            </span>
          )
        },
        size: 160,
      },
      {
        id: "updated",
        header: "Updated",
        cell: ({ row }) => {
          const updatedAt = row.original.updated_at || row.original.created_at
          return (
            <span className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
            </span>
          )
        },
        size: 180,
        meta: {
          cellClassName: "whitespace-nowrap",
        },
      },
      {
        id: "actions",
        header: <span className="sr-only">Actions</span>,
        enableResizing: false,
        cell: ({ row }) => <DocumentActions document={row.original} />,
        meta: {
          headerClassName: "text-right",
          cellClassName: "text-right",
        },
        size: 120,
      },
    ],
    [],
  )

  if (loading) {
    return (
      <Card className="space-y-3 p-6">
        <div className="h-5 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="grid gap-3">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3">
              <div className="h-10 animate-pulse rounded bg-muted" />
              <div className="h-8 w-24 animate-pulse rounded bg-muted" />
              <div className="h-8 w-20 animate-pulse rounded bg-muted" />
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="space-y-4 p-6">
        <div className="text-center">
          <p className="mb-2 text-destructive">Error loading documents</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </Card>
    )
  }

  const emptyState = (
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">No documents found</p>
      <p className="text-sm text-muted-foreground">
        {Object.keys(filter).length > 0
          ? "No documents match your current filters."
          : "Get started by uploading your first document."}
      </p>
    </div>
  )

  return (
    <Table
      columns={columns}
      data={documents}
      tableId="documents-list"
      emptyState={emptyState}
      className="bg-card"
    />
  )
}
