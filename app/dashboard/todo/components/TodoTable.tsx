'use client'

import * as React from 'react'
import { ColumnDef, ColumnPinningState, SortingState } from '@tanstack/react-table'
import { TrashIcon } from '@radix-ui/react-icons'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { VirtualizedDataGrid, type DataGridRenderMetrics } from '@/components/ui/data-grid'
import { cn } from '@/lib/utils'

import EditTodo from './EditTodo'

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

type TodoRow = {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed'
  createdAt: string
  createdBy: string
}

type TodosResponse = {
  rows: TodoRow[]
  total: number
}

const defaultSorting: SortingState = [{ id: 'createdAt', desc: true }]

const columns: ColumnDef<TodoRow, unknown>[] = [
  {
    accessorKey: 'title',
    header: 'Task',
    meta: { headerLabel: 'Task' },
    cell: ({ getValue }) => (
      <span className="font-medium text-foreground">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    meta: { headerLabel: 'Status' },
    cell: ({ getValue }) => {
      const status = getValue<TodoRow['status']>()
      const label = status.replace('_', ' ')
      return (
        <Badge
          variant="outline"
          className={cn('capitalize', {
            'border-emerald-200 bg-emerald-50 text-emerald-700': status === 'completed',
            'border-amber-200 bg-amber-50 text-amber-700': status === 'in_progress',
            'border-slate-200 bg-slate-50 text-slate-700': status === 'pending',
          })}
        >
          {label}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    meta: { headerLabel: 'Created' },
    cell: ({ getValue }) => {
      const value = getValue<string>()
      const formatted = value ? DATE_FORMATTER.format(new Date(value)) : '—'
      return <span className="text-sm text-muted-foreground">{formatted}</span>
    },
  },
  {
    accessorKey: 'createdBy',
    header: 'Owner',
    meta: { headerLabel: 'Owner' },
    cell: ({ getValue }) => <span className="text-sm text-foreground">{getValue<string>()}</span>,
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
          aria-label={`Delete ${row.original.title}`}
        >
          <TrashIcon className="size-3.5" />
          Delete
        </Button>
        <EditTodo />
      </div>
    ),
  },
]

export default function TodoTable() {
  const [todos, setTodos] = React.useState<TodoRow[]>([])
  const [totalRows, setTotalRows] = React.useState(0)
  const [pageIndex, setPageIndex] = React.useState(0)
  const [pageSize, setPageSize] = React.useState(50)
  const [sorting, setSorting] = React.useState<SortingState>(defaultSorting)
  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>({
    left: ['title'],
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

    async function loadTodos() {
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
        const response = await fetch(`/api/admin/todos?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Failed to load tasks')
        }

        const payload = (await response.json()) as TodosResponse

        if (!isCurrent) return

        setTodos(payload.rows)
        setTotalRows(payload.total)
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError') return
        console.error(loadError)
        if (!isCurrent) return
        setTodos([])
        setTotalRows(0)
        setError('Unable to load admin tasks. Please try again.')
      } finally {
        if (isCurrent) {
          setIsLoading(false)
        }
      }
    }

    loadTodos()

    return () => {
      isCurrent = false
      controller.abort()
    }
  }, [pageIndex, pageSize, sorting, debouncedSearch])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Maintenance queue</h2>
          <p className="text-sm text-muted-foreground">
            {metrics
              ? `Last render ${metrics.duration.toFixed(1)}ms for ${metrics.rowCount} rows.`
              : 'Virtualized queue optimised for tens of thousands of tickets.'}
          </p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <div className="w-full max-w-xs">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title, owner, or status"
            aria-label="Search admin tasks"
          />
        </div>
      </div>

      <VirtualizedDataGrid
        ariaLabel="Admin tasks grid"
        columns={columns}
        data={todos}
        totalRows={totalRows}
        pageIndex={pageIndex}
        pageSize={pageSize}
        sorting={sorting}
        columnPinning={columnPinning}
        isLoading={isLoading}
        emptyState={<span>No admin tasks match your filters.</span>}
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
