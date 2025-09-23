'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { FileText } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { DocumentListFilters, DocumentListSort, DocumentWithLease } from '@/types/documents'
import type { DocumentColumnId } from '@/lib/documents/csv-columns'
import { DOCUMENT_CSV_COLUMNS_MAP } from '@/lib/documents/csv-columns'
import { getDocumentsAction } from '../actions'
import { DocumentActions } from './document-actions'

interface DocumentsListProps {
  filters: DocumentListFilters
  sort?: DocumentListSort
  visibleColumns: DocumentColumnId[]
}

const statusVariants: Record<string, 'default' | 'outline' | 'secondary' | 'destructive'> = {
  draft: 'secondary',
  pending_signature: 'outline',
  signed: 'default',
  expired: 'destructive',
  cancelled: 'secondary',
}

const columnRenderers: Record<
  DocumentColumnId,
  (document: DocumentWithLease) => React.ReactNode
> = {
  title: (document) => {
    const lastUpdated = document.updated_at ?? document.created_at

    return (
      <div className="space-y-1">
        <p className="font-medium text-foreground">{document.title}</p>
        {document.description ? (
          <p className="text-sm text-muted-foreground">{document.description}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Updated {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
        </p>
      </div>
    )
  },
  document_type: (document) => {
    const label =
      DOCUMENT_CSV_COLUMNS_MAP.get('document_type')?.getValue(document) ??
      document.document_type

    return <Badge variant="outline">{label}</Badge>
  },
  status: (document) => {
    const label =
      DOCUMENT_CSV_COLUMNS_MAP.get('status')?.getValue(document) ??
      document.status
    const variant = statusVariants[document.status] ?? 'secondary'

    return <Badge variant={variant}>{label}</Badge>
  },
  created_at: (document) => {
    const createdAt = parseISO(document.created_at)

    return (
      <div className="space-y-1">
        <p className="text-sm font-medium">{format(createdAt, 'MMM d, yyyy')}</p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(createdAt, { addSuffix: true })}
        </p>
      </div>
    )
  },
  signature_progress: (document) => {
    const value =
      DOCUMENT_CSV_COLUMNS_MAP.get('signature_progress')?.getValue(document) ??
      '—'

    return <span className="text-sm text-muted-foreground">{value}</span>
  },
  tenant_count: (document) => {
    const value =
      DOCUMENT_CSV_COLUMNS_MAP.get('tenant_count')?.getValue(document) ?? '—'
    const numeric = Number.parseInt(value, 10)

    if (!Number.isNaN(numeric)) {
      return (
        <span className="text-sm text-muted-foreground">
          {numeric} {numeric === 1 ? 'tenant' : 'tenants'}
        </span>
      )
    }

    return <span className="text-sm text-muted-foreground">{value}</span>
  },
  rent: (document) => {
    const value = DOCUMENT_CSV_COLUMNS_MAP.get('rent')?.getValue(document) ?? '—'

    return <span className="text-sm text-muted-foreground">{value}</span>
  },
  requires_signature: (document) => {
    const value =
      DOCUMENT_CSV_COLUMNS_MAP.get('requires_signature')?.getValue(document) ??
      (document.requires_signature ? 'Yes' : 'No')

    return (
      <Badge
        variant={document.requires_signature ? 'default' : 'secondary'}
        className="uppercase"
      >
        {value}
      </Badge>
    )
  },
  expires_at: (document) => {
    const value =
      DOCUMENT_CSV_COLUMNS_MAP.get('expires_at')?.getValue(document) ?? '—'

    return <span className="text-sm text-muted-foreground">{value}</span>
  },
}

export function DocumentsList({
  filters,
  sort,
  visibleColumns,
}: DocumentsListProps) {
  const [documents, setDocuments] = useState<DocumentWithLease[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const serializedFilters = useMemo(
    () => JSON.stringify(filters ?? {}),
    [filters],
  )
  const serializedSort = useMemo(
    () => JSON.stringify(sort ?? null),
    [sort],
  )
  const hasActiveFilters = useMemo(() => {
    const parsed = serializedFilters ? JSON.parse(serializedFilters) : {}
    return Object.keys(parsed as Record<string, unknown>).length > 0
  }, [serializedFilters])

  const orderedVisibleColumns = useMemo(
    () =>
      visibleColumns.filter((columnId) =>
        DOCUMENT_CSV_COLUMNS_MAP.has(columnId),
      ),
    [visibleColumns],
  )

  useEffect(() => {
    let cancelled = false

    const fetchDocuments = async () => {
      try {
        setLoading(true)
        setError(null)

        const parsedFilters: DocumentListFilters = serializedFilters
          ? (JSON.parse(serializedFilters) as DocumentListFilters)
          : {}
        const parsedSort: DocumentListSort | undefined = serializedSort
          ? (JSON.parse(serializedSort) as DocumentListSort)
          : undefined

        const result = await getDocumentsAction({
          filters: parsedFilters,
          sort: parsedSort,
        })

        if (cancelled) {
          return
        }

        if (result.success && result.data) {
          setDocuments(result.data)
        } else {
          setError(result.error || 'Failed to fetch documents')
        }
      } catch (fetchError) {
        console.error('Error fetching documents:', fetchError)
        if (!cancelled) {
          setError('An unexpected error occurred')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchDocuments()

    return () => {
      cancelled = true
    }
  }, [serializedFilters, serializedSort, reloadKey])

  const columnCount = orderedVisibleColumns.length + 1

  if (loading) {
    return <DocumentsTableSkeleton columnCount={columnCount} />
  }

  if (error) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <p className="text-sm font-medium text-destructive">Error loading documents</p>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => setReloadKey((key) => key + 1)}
        >
          Try again
        </Button>
      </div>
    )
  }

  if (orderedVisibleColumns.length === 0) {
    return (
      <div className="rounded-lg border p-6 text-sm text-muted-foreground">
        Select at least one column to display.
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-lg border p-12 text-center">
        <FileText className="mx-auto mb-4 size-12 text-muted-foreground" />
        <h3 className="text-lg font-medium">No documents found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {hasActiveFilters
            ? 'No documents match your current filters.'
            : 'Get started by uploading your first document.'}
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] divide-y rounded-lg border">
        <thead className="bg-muted/40">
          <tr className="text-xs uppercase tracking-wide text-muted-foreground">
            {orderedVisibleColumns.map((columnId) => {
              const label =
                DOCUMENT_CSV_COLUMNS_MAP.get(columnId)?.label ?? columnId
              return (
                <th key={columnId} className="px-4 py-3 text-left font-medium">
                  {label}
                </th>
              )
            })}
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {documents.map((document) => (
            <tr key={document.id} className="bg-background hover:bg-muted/40">
              {orderedVisibleColumns.map((columnId) => (
                <td key={columnId} className="px-4 py-3 align-top text-sm">
                  {columnRenderers[columnId]?.(document)}
                </td>
              ))}
              <td className="px-4 py-3 align-top text-right">
                <DocumentActions document={document} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DocumentsTableSkeleton({
  columnCount,
}: {
  columnCount: number
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full min-w-[720px]">
        <thead className="bg-muted/40">
          <tr>
            {Array.from({ length: columnCount }).map((_, index) => (
              <th key={index} className="px-4 py-3 text-left">
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-t">
              {Array.from({ length: columnCount }).map((_, cellIndex) => (
                <td key={cellIndex} className="px-4 py-4">
                  <div className="h-4 w-full max-w-[200px] animate-pulse rounded bg-muted" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
