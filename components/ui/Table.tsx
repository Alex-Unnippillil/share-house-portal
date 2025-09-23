"use client"

import React, { useEffect, useState } from "react"
import {
  ColumnDef,
  ColumnSizingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { cn } from "@/lib/utils"

export type TableColumnMeta = {
  headerClassName?: string
  cellClassName?: string
}

interface TableProps<TData> {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  tableId: string
  className?: string
  emptyState?: React.ReactNode
}

const STORAGE_PREFIX = "table-column-sizing:"

export default function Table<TData>({
  columns,
  data,
  tableId,
  className,
  emptyState,
}: TableProps<TData>) {
  const storageKey = `${STORAGE_PREFIX}${tableId}`
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
  const [hasLoadedSizing, setHasLoadedSizing] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const stored = window.localStorage.getItem(storageKey)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ColumnSizingState
        setColumnSizing(parsed)
      } catch {
        window.localStorage.removeItem(storageKey)
      }
    }

    setHasLoadedSizing(true)
  }, [storageKey])

  useEffect(() => {
    if (!hasLoadedSizing || typeof window === "undefined") {
      return
    }

    window.localStorage.setItem(storageKey, JSON.stringify(columnSizing))
  }, [columnSizing, storageKey, hasLoadedSizing])

  const table = useReactTable({
    data,
    columns,
    state: { columnSizing },
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange",
    defaultColumn: {
      minSize: 120,
      size: 200,
      maxSize: 600,
    },
  })

  const headerGroups = table.getHeaderGroups()
  const rows = table.getRowModel().rows
  const columnCount = Math.max(table.getAllLeafColumns().length, 1)
  const totalSize = table.getTotalSize()

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl border border-border bg-background",
        className,
      )}
    >
      <div className="w-full overflow-x-auto">
        <table
          className="w-full border-collapse text-sm"
          style={{
            width: totalSize ? `${totalSize}px` : "100%",
            minWidth: "100%",
          }}
        >
          <thead className="sticky top-0 z-20 bg-background shadow-sm">
            {headerGroups.map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border">
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as TableColumnMeta | undefined

                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      style={{ width: header.getSize() }}
                      className={cn(
                        "relative border-r border-border bg-background px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground last:border-r-0",
                        meta?.headerClassName,
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}

                      {header.column.getCanResize() ? (
                        <div
                          data-testid={`resize-handle-${header.column.id}`}
                          role="separator"
                          aria-orientation="vertical"
                          aria-label={`Resize column ${header.column.id}`}
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          onDoubleClick={header.column.resetSize}
                          className="absolute right-0 top-0 h-full w-2 cursor-col-resize select-none touch-none"
                        >
                          <span className="absolute inset-y-2 right-0 w-px rounded-full bg-border" />
                        </div>
                      ) : null}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-b-0">
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as TableColumnMeta | undefined

                    return (
                      <td
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                        className={cn(
                          "px-4 py-3 align-top text-sm text-foreground",
                          meta?.cellClassName,
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    )
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columnCount}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  {emptyState ?? "No results found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
