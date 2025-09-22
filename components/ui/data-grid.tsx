'use client'

import * as React from 'react'
import {
  ColumnPinningState,
  ColumnDef,
  flexRender,
  getCoreRowModel,
  SortingState,
  Updater,
  useReactTable,
  type Table,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp, ArrowUpDown, Pin, PinOff } from 'lucide-react'

import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { cn } from '@/lib/utils'

export type DataGridRenderMetrics = {
  duration: number
  rowCount: number
  timestamp: number
}

type OnSortingChange = (updater: Updater<SortingState>) => void

type OnColumnPinningChange = (updater: Updater<ColumnPinningState>) => void

type OnPageChange = (pageIndex: number) => void

type OnPageSizeChange = (pageSize: number) => void

export type VirtualizedDataGridProps<TData> = {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  totalRows: number
  pageIndex: number
  pageSize: number
  sorting: SortingState
  columnPinning: ColumnPinningState
  isLoading?: boolean
  emptyState?: React.ReactNode
  ariaLabel?: string
  height?: number
  overscan?: number
  rowHeight?: number
  onSortingChange: OnSortingChange
  onColumnPinningChange: OnColumnPinningChange
  onPageChange: OnPageChange
  onPageSizeChange: OnPageSizeChange
  onRenderMetrics?: (metrics: DataGridRenderMetrics) => void
}

type PinnedOffsets = {
  left: Map<string, number>
  right: Map<string, number>
}

function computePinnedOffsets<TData>(table: Table<TData>): PinnedOffsets {
  const left = new Map<string, number>()
  const right = new Map<string, number>()

  let leftOffset = 0
  table.getLeftLeafColumns().forEach((column) => {
    left.set(column.id, leftOffset)
    leftOffset += column.getSize()
  })

  let rightOffset = 0
  ;[...table.getRightLeafColumns()].reverse().forEach((column) => {
    right.set(column.id, rightOffset)
    rightOffset += column.getSize()
  })

  return { left, right }
}

export function VirtualizedDataGrid<TData>({
  columns,
  data,
  totalRows,
  pageIndex,
  pageSize,
  sorting,
  columnPinning,
  isLoading = false,
  emptyState,
  ariaLabel,
  height = 480,
  overscan = 6,
  rowHeight = 52,
  onSortingChange,
  onColumnPinningChange,
  onPageChange,
  onPageSizeChange,
  onRenderMetrics,
}: VirtualizedDataGridProps<TData>) {
  const renderStartRef = React.useRef(performance.now())
  renderStartRef.current = performance.now()

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnPinning,
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    onSortingChange,
    onColumnPinningChange,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    enableSortingRemoval: false,
    enableColumnPinning: true,
    columnResizeMode: 'onChange',
    defaultColumn: {
      minSize: 120,
      size: 180,
    },
    getRowId: (row: any, index) => row?.id ?? `row-${index}`,
  })

  const containerRef = React.useRef<HTMLDivElement>(null)
  const rows = table.getRowModel().rows

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => rowHeight,
    overscan,
  })

  const virtualItems = virtualizer.getVirtualItems()

  const pinnedOffsets = computePinnedOffsets(table)
  const leafColumns = table.getVisibleLeafColumns()
  const columnTemplate = leafColumns.map((column) => `${column.getSize()}px`).join(' ')
  const totalColumnWidth = leafColumns.reduce((total, column) => total + column.getSize(), 0)

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const startRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1
  const endRow = totalRows === 0 ? 0 : Math.min(totalRows, (pageIndex + 1) * pageSize)

  const [activeCell, setActiveCell] = React.useState({ row: 0, column: 0 })

  React.useEffect(() => {
    if (activeCell.row >= rows.length) {
      setActiveCell((current) => ({ ...current, row: Math.max(0, rows.length - 1) }))
    }
  }, [rows.length, activeCell.row])

  React.useEffect(() => {
    setActiveCell({ row: 0, column: 0 })
  }, [pageIndex, pageSize, sorting, data.length])

  React.useEffect(() => {
    if (isLoading) return
    const duration = performance.now() - renderStartRef.current
    onRenderMetrics?.({ duration, rowCount: data.length, timestamp: Date.now() })
  }, [data, isLoading, onRenderMetrics, columnPinning, pageIndex, pageSize, sorting])

  const handlePageChange = React.useCallback(
    (nextPageIndex: number) => {
      const safeIndex = Math.min(Math.max(nextPageIndex, 0), totalPages - 1)
      onPageChange(safeIndex)
    },
    [onPageChange, totalPages],
  )

  const handleKeyNavigation = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>, rowIndex: number, columnIndex: number) => {
      if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageDown', 'PageUp'].includes(event.key)) {
        return
      }

      event.preventDefault()
      const totalColumns = leafColumns.length
      const lastRowIndex = rows.length - 1

      switch (event.key) {
        case 'ArrowRight':
          setActiveCell({ row: rowIndex, column: Math.min(columnIndex + 1, totalColumns - 1) })
          break
        case 'ArrowLeft':
          setActiveCell({ row: rowIndex, column: Math.max(columnIndex - 1, 0) })
          break
        case 'ArrowDown': {
          const nextRow = Math.min(rowIndex + 1, lastRowIndex)
          setActiveCell({ row: nextRow, column: columnIndex })
          virtualizer.scrollToIndex(nextRow)
          break
        }
        case 'ArrowUp': {
          const nextRow = Math.max(rowIndex - 1, 0)
          setActiveCell({ row: nextRow, column: columnIndex })
          virtualizer.scrollToIndex(nextRow)
          break
        }
        case 'Home':
          setActiveCell({ row: 0, column: 0 })
          virtualizer.scrollToIndex(0)
          break
        case 'End':
          setActiveCell({ row: lastRowIndex, column: totalColumns - 1 })
          virtualizer.scrollToIndex(lastRowIndex)
          break
        case 'PageDown': {
          const viewport = Math.max(1, Math.floor(height / rowHeight) - 1)
          const nextRow = Math.min(rowIndex + viewport, lastRowIndex)
          setActiveCell({ row: nextRow, column: columnIndex })
          virtualizer.scrollToIndex(nextRow)
          break
        }
        case 'PageUp': {
          const viewport = Math.max(1, Math.floor(height / rowHeight) - 1)
          const nextRow = Math.max(rowIndex - viewport, 0)
          setActiveCell({ row: nextRow, column: columnIndex })
          virtualizer.scrollToIndex(nextRow)
          break
        }
      }
    },
    [height, leafColumns.length, rowHeight, rows.length, virtualizer],
  )

  return (
    <div className="flex flex-col gap-4">
      <div
        className="overflow-hidden rounded-md border border-border bg-background"
        role="region"
        aria-label={ariaLabel ?? 'Virtualized data grid'}
      >
        <div
          role="grid"
          aria-busy={isLoading}
          aria-colcount={leafColumns.length}
          aria-rowcount={totalRows}
          className="w-full"
        >
          <div className="sticky top-0 z-20 border-b border-border bg-muted/50 backdrop-blur">
            {table.getHeaderGroups().map((headerGroup) => (
              <div
                key={headerGroup.id}
                role="row"
                className="grid text-sm font-medium"
                style={{ gridTemplateColumns: columnTemplate, minWidth: totalColumnWidth }}
              >
                {headerGroup.headers.map((header) => {
                  if (header.isPlaceholder) return null
                  const column = header.column
                  const headerMeta = (column.columnDef.meta as { headerLabel?: string } | undefined)?.headerLabel
                  const headerLabel = headerMeta ?? column.id
                  const isPinned = column.getIsPinned()
                  const canSort = column.getCanSort()
                  const sortingHandler = column.getToggleSortingHandler()
                  const pinnedStyle =
                    isPinned === 'left'
                      ? {
                          position: 'sticky' as const,
                          left: pinnedOffsets.left.get(column.id) ?? 0,
                          zIndex: 30,
                        }
                      : isPinned === 'right'
                      ? {
                          position: 'sticky' as const,
                          right: pinnedOffsets.right.get(column.id) ?? 0,
                          zIndex: 30,
                        }
                      : undefined
                  const sorted = column.getIsSorted()

                  return (
                    <div
                      key={header.id}
                      role="columnheader"
                      aria-colindex={column.getIndex() + 1}
                      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'}
                      className={cn('flex items-center gap-2 border-r border-border bg-muted/50 px-3 py-2')}
                      style={{
                        ...pinnedStyle,
                        width: column.getSize(),
                        minWidth: column.getSize(),
                      }}
                    >
                      <button
                        type="button"
                        onClick={canSort ? sortingHandler : undefined}
                        className="flex flex-1 items-center justify-between gap-2 text-left"
                        aria-label={`Sort by ${headerLabel}`}
                        disabled={!canSort}
                        aria-disabled={!canSort}
                      >
                        <span className="truncate">
                          {flexRender(column.columnDef.header, header.getContext())}
                        </span>
                        {canSort ? (
                          sorted ? (
                            sorted === 'asc' ? (
                              <ArrowUp className="size-3.5" aria-hidden />
                            ) : (
                              <ArrowDown className="size-3.5" aria-hidden />
                            )
                          ) : (
                            <ArrowUpDown className="size-3.5 opacity-60" aria-hidden />
                          )
                        ) : null}
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 text-muted-foreground"
                            aria-label={`Pin options for ${headerLabel}`}
                          >
                            {column.getIsPinned() ? (
                              <Pin className="size-3.5" aria-hidden />
                            ) : (
                              <PinOff className="size-3.5" aria-hidden />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => column.pin('left')}>
                            Pin left
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => column.pin('right')}>
                            Pin right
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => column.pin(false)}>
                            Unpin
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          <div
            ref={containerRef}
            className="relative w-full overflow-auto"
            style={{ height, minWidth: totalColumnWidth }}
          >
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualItems.map((virtualRow) => {
                const row = rows[virtualRow.index]
                if (!row) {
                  return null
                }

                const cells = row.getVisibleCells()

                return (
                  <div
                    key={row.id}
                    role="row"
                    aria-rowindex={pageIndex * pageSize + virtualRow.index + 1}
                    className={cn('grid border-b border-border bg-background text-sm', {
                      'bg-muted/40': activeCell.row === virtualRow.index,
                    })}
                    style={{
                      gridTemplateColumns: columnTemplate,
                      minWidth: totalColumnWidth,
                      height: virtualRow.size,
                      transform: `translateY(${virtualRow.start}px)`,
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                    }}
                  >
                    {cells.map((cell, cellIndex) => {
                      const column = cell.column
                      const isPinned = column.getIsPinned()
                      const pinnedStyle =
                        isPinned === 'left'
                          ? {
                              position: 'sticky' as const,
                              left: pinnedOffsets.left.get(column.id) ?? 0,
                              zIndex: 20,
                            }
                          : isPinned === 'right'
                          ? {
                              position: 'sticky' as const,
                              right: pinnedOffsets.right.get(column.id) ?? 0,
                              zIndex: 20,
                            }
                          : undefined
                      const isActive = activeCell.row === virtualRow.index && activeCell.column === cellIndex

                      return (
                        <div
                          key={cell.id}
                          role="gridcell"
                          tabIndex={isActive ? 0 : -1}
                          aria-colindex={column.getIndex() + 1}
                          onFocus={() => setActiveCell({ row: virtualRow.index, column: cellIndex })}
                          onKeyDown={(event) => handleKeyNavigation(event, virtualRow.index, cellIndex)}
                          className={cn('flex h-full items-center gap-2 px-3 py-2 outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background', {
                            'bg-accent text-accent-foreground': isActive,
                          })}
                          style={{
                            ...pinnedStyle,
                            width: column.getSize(),
                            minWidth: column.getSize(),
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          {!isLoading && rows.length === 0 ? (
            <div role="row" className="p-6 text-sm text-muted-foreground">
              {emptyState ?? 'No results found.'}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          {isLoading
            ? 'Loading rows…'
            : `Showing ${startRow.toLocaleString()}-${endRow.toLocaleString()} of ${totalRows.toLocaleString()}`}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="rows-per-page" className="text-muted-foreground">
            Rows per page
          </label>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number.parseInt(value, 10))}
          >
            <SelectTrigger id="rows-per-page" className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[25, 50, 100, 250].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1" role="group" aria-label="Pagination controls">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(0)}
              disabled={pageIndex === 0}
            >
              First
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(pageIndex - 1)}
              disabled={pageIndex === 0}
            >
              Prev
            </Button>
            <span aria-live="polite" className="px-2 font-medium">
              Page {pageIndex + 1} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(pageIndex + 1)}
              disabled={pageIndex + 1 >= totalPages}
            >
              Next
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(totalPages - 1)}
              disabled={pageIndex + 1 >= totalPages}
            >
              Last
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
