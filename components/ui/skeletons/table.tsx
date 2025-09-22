import * as React from "react"

import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

export interface TableSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: number
  rows?: number
  showHeader?: boolean
}

export function TableSkeleton({
  columns = 4,
  rows = 5,
  showHeader = true,
  className,
  ...props
}: TableSkeletonProps) {
  const columnArray = React.useMemo(() => Array.from({ length: Math.max(columns, 1) }), [columns])
  const rowArray = React.useMemo(() => Array.from({ length: Math.max(rows, 1) }), [rows])

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn("overflow-hidden rounded-xl border", className)}
      {...props}
    >
      <table className="w-full border-collapse text-left text-sm">
        {showHeader && (
          <thead className="bg-muted/30">
            <tr>
              {columnArray.map((_, index) => (
                <th key={index} className="px-4 py-3">
                  <Skeleton className="h-3 w-3/4" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rowArray.map((_, rowIndex) => (
            <tr key={rowIndex} className="border-t">
              {columnArray.map((_, columnIndex) => (
                <td key={columnIndex} className="px-4 py-3">
                  <Skeleton className="h-4 w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
