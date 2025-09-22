'use client'

import * as React from 'react'
import { ColumnDef, ColumnPinningState, SortingState } from '@tanstack/react-table'
import { TrashIcon } from '@radix-ui/react-icons'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { VirtualizedDataGrid, type DataGridRenderMetrics } from '@/components/ui/data-grid'
import { cn } from '@/lib/utils'

import EditMember from './edit/EditMember'

type MemberRow = {
  id: string
  name: string
  email: string
  role: 'admin' | 'property_manager' | 'tenant'
  status: 'active' | 'inactive' | 'invited'
  joinedAt: string
}

type MembersResponse = {
  rows: MemberRow[]
  total: number
}

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

const defaultSorting: SortingState = [{ id: 'joinedAt', desc: true }]

const columns: ColumnDef<MemberRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Member',
    meta: { headerLabel: 'Member' },
    cell: ({ row, getValue }) => (
      <div className="flex flex-col">
        <span className="font-medium leading-tight">{getValue<string>()}</span>
        <span className="text-xs text-muted-foreground">{row.original.email}</span>
      </div>
    ),
  },
  {
    accessorKey: 'role',
    header: 'Role',
    meta: { headerLabel: 'Role' },
    cell: ({ getValue }) => {
      const role = getValue<MemberRow['role']>()
      const label = role.replace('_', ' ')

      return (
        <Badge
          variant="outline"
          className={cn('capitalize', {
            'border-emerald-200 bg-emerald-50 text-emerald-700': role === 'admin',
            'border-blue-200 bg-blue-50 text-blue-700': role === 'property_manager',
            'border-orange-200 bg-orange-50 text-orange-700': role === 'tenant',
          })}
        >
          {label}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'joinedAt',
    header: 'Joined',
    meta: { headerLabel: 'Joined' },
    cell: ({ getValue }) => {
      const value = getValue<string>()
      const formatted = value ? DATE_FORMATTER.format(new Date(value)) : '—'
      return <span className="text-sm text-muted-foreground">{formatted}</span>
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    meta: { headerLabel: 'Status' },
    cell: ({ getValue }) => {
      const status = getValue<MemberRow['status']>()
      const label = status.replace('_', ' ')
      return (
        <Badge
          variant="secondary"
          className={cn('capitalize', {
            'bg-emerald-100 text-emerald-700': status === 'active',
            'bg-amber-100 text-amber-700': status === 'invited',
            'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-50': status === 'inactive',
          })}
        >
          {label}
        </Badge>
      )
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    meta: { headerLabel: 'Actions' },
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          aria-label={`Delete ${row.original.name}`}
        >
          <TrashIcon className="size-3.5" />
          Delete
        </Button>
        <EditMember />
      </div>
    ),
  },
]

export default function MemberTable() {
  const [members, setMembers] = React.useState<MemberRow[]>([])
  const [totalRows, setTotalRows] = React.useState(0)
  const [pageIndex, setPageIndex] = React.useState(0)
  const [pageSize, setPageSize] = React.useState(50)
  const [sorting, setSorting] = React.useState<SortingState>(defaultSorting)
  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>({
    left: ['name'],
    right: ['actions'],
  })
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  const [metrics, setMetrics] = React.useState<DataGridRenderMetrics | null>(null)

  React.useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(timeout)
  }, [search])

  React.useEffect(() => {
    setPageIndex(0)
  }, [debouncedSearch])

  React.useEffect(() => {
    let isCurrent = true
    const controller = new AbortController()

    async function loadMembers() {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: String(pageIndex + 1),
        pageSize: String(pageSize),
      })

      if (sorting.length > 0) {
        const [sort] = sorting
        params.set('sortBy', sort.id)
        params.set('sortDir', sort.desc ? 'desc' : 'asc')
      }

      if (debouncedSearch) {
        params.set('q', debouncedSearch)
      }

      try {
        const response = await fetch(`/api/admin/members?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Failed to load members')
        }

        const payload = (await response.json()) as MembersResponse

        if (!isCurrent) return

        setMembers(payload.rows)
        setTotalRows(payload.total)
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError') return
        console.error(loadError)
        if (!isCurrent) return
        setMembers([])
        setTotalRows(0)
        setError('Unable to load members. Please try again.')
      } finally {
        if (isCurrent) {
          setIsLoading(false)
        }
      }
    }

    loadMembers()

    return () => {
      isCurrent = false
      controller.abort()
    }
  }, [pageIndex, pageSize, sorting, debouncedSearch])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Member directory</h2>
          <p className="text-sm text-muted-foreground">
            {metrics
              ? `Last render ${metrics.duration.toFixed(1)}ms for ${metrics.rowCount} rows.`
              : 'Server-filtered view across 50,000 member records.'}
          </p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <div className="w-full max-w-xs">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, or status"
            aria-label="Search members"
          />
        </div>
      </div>

      <VirtualizedDataGrid
        ariaLabel="Members data grid"
        columns={columns}
        data={members}
        totalRows={totalRows}
        pageIndex={pageIndex}
        pageSize={pageSize}
        sorting={sorting}
        columnPinning={columnPinning}
        isLoading={isLoading}
        emptyState={<span>No members found for this view.</span>}
        onSortingChange={(updater) => {
          setPageIndex(0)
          setSorting((prev) => (typeof updater === 'function' ? updater(prev) : updater))
        }}
        onColumnPinningChange={(updater) =>
          setColumnPinning((prev) => (typeof updater === 'function' ? updater(prev) : updater))
        }
        onPageChange={setPageIndex}
        onPageSizeChange={(size) => {
          setPageIndex(0)
          setPageSize(size)
        }}
        onRenderMetrics={setMetrics}
      />
    </div>
  )
}
