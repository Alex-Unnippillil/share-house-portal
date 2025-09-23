'use client'

import { Suspense, useCallback, useMemo, useState } from 'react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DocumentsFilters } from "./documents-filters"
import { DocumentsList } from "./documents-list"
import { exportDocumentsAction } from "../actions"
import { DOCUMENT_CSV_COLUMNS, type DocumentColumnId } from '@/lib/documents/csv-columns'
import type { DocumentListFilters, DocumentListSort } from '@/types/documents'

const LEASES_FILTER: DocumentListFilters = { type: ['lease'] }
const PENDING_FILTER: DocumentListFilters = { status: ['pending_signature'] }
const SIGNED_FILTER: DocumentListFilters = { status: ['signed'] }

export function DocumentsWorkspace() {
  const [filters, setFilters] = useState<DocumentListFilters>({})
  const [sort, setSort] = useState<DocumentListSort>({
    column: 'created_at',
    direction: 'desc',
  })
  const [columnVisibility, setColumnVisibility] = useState<Record<DocumentColumnId, boolean>>(() => {
    const initial: Record<DocumentColumnId, boolean> = {}
    for (const column of DOCUMENT_CSV_COLUMNS) {
      initial[column.id] = true
    }
    initial.title = true
    return initial
  })
  const [exporting, setExporting] = useState(false)

  const visibleColumns = useMemo(
    () =>
      DOCUMENT_CSV_COLUMNS.map((column) => column.id).filter(
        (columnId) => columnVisibility[columnId] !== false,
      ),
    [columnVisibility],
  )

  const handleColumnVisibilityChange = useCallback(
    (columnId: DocumentColumnId, visible: boolean) => {
      if (!visible && columnId === 'title') {
        return
      }

      setColumnVisibility((previous) => ({
        ...previous,
        [columnId]: visible,
      }))
    },
    [],
  )

  const handleExport = useCallback(async () => {
    if (visibleColumns.length === 0) {
      return
    }

    try {
      setExporting(true)
      const result = await exportDocumentsAction({
        filters,
        sort,
        columns: visibleColumns,
      })

      if (result.success && result.data) {
        const blob = new Blob([result.data.csv], {
          type: 'text/csv;charset=utf-8;',
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = result.data.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } else if (result.error) {
        console.error('Failed to export documents:', result.error)
      }
    } catch (error) {
      console.error('Unexpected error exporting documents:', error)
    } finally {
      setExporting(false)
    }
  }, [filters, sort, visibleColumns])

  const baseFilters = filters
  const leasesFilters = useMemo(() => ({ ...filters, ...LEASES_FILTER }), [filters])
  const pendingFilters = useMemo(() => ({ ...filters, ...PENDING_FILTER }), [filters])
  const signedFilters = useMemo(() => ({ ...filters, ...SIGNED_FILTER }), [filters])

  return (
    <Tabs defaultValue="all" className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="leases">Leases</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="signed">Signed</TabsTrigger>
        </TabsList>
        <DocumentsFilters
          filters={filters}
          onFiltersChange={setFilters}
          sort={sort}
          onSortChange={setSort}
          columns={DOCUMENT_CSV_COLUMNS}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={handleColumnVisibilityChange}
          onExport={handleExport}
          exporting={exporting}
        />
      </div>

      <TabsContent value="all" className="space-y-6">
        <Suspense fallback={<DocumentsListSkeleton />}>
          <DocumentsList
            filters={baseFilters}
            sort={sort}
            visibleColumns={visibleColumns}
          />
        </Suspense>
      </TabsContent>

      <TabsContent value="leases" className="space-y-6">
        <Suspense fallback={<DocumentsListSkeleton />}>
          <DocumentsList
            filters={leasesFilters}
            sort={sort}
            visibleColumns={visibleColumns}
          />
        </Suspense>
      </TabsContent>

      <TabsContent value="pending" className="space-y-6">
        <Suspense fallback={<DocumentsListSkeleton />}>
          <DocumentsList
            filters={pendingFilters}
            sort={sort}
            visibleColumns={visibleColumns}
          />
        </Suspense>
      </TabsContent>

      <TabsContent value="signed" className="space-y-6">
        <Suspense fallback={<DocumentsListSkeleton />}>
          <DocumentsList
            filters={signedFilters}
            sort={sort}
            visibleColumns={visibleColumns}
          />
        </Suspense>
      </TabsContent>
    </Tabs>
  )
}

function DocumentsListSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full min-w-[760px]">
        <thead className="bg-muted/40">
          <tr>
            {Array.from({ length: 6 }).map((_, index) => (
              <th key={index} className="px-4 py-3 text-left">
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-t">
              {Array.from({ length: 6 }).map((_, cellIndex) => (
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
