import { FlowStateCard } from '@/components/feedback/flow-state'
import Link from 'next/link'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type DomainTableProps = {
  title: string
  description: string
  columns: string[]
  rows: Array<string[]>
  emptyStateDescription?: string
}

export function DomainTable({ title, description, columns, rows, emptyStateDescription }: DomainTableProps) {
  pagination?: {
    page: number
    totalPages: number
    totalRows: number
    prevHref?: string
    nextHref?: string
  }
}

export function DomainTable({ title, description, columns, rows, pagination }: DomainTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {!rows.length ? (
          <FlowStateCard
            variant="empty"
            title="No records in this queue"
            description={emptyStateDescription ?? 'This queue is clear right now. New operational events will appear here as they are synced.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b text-left">
                  {columns.map((column) => (
                    <th key={column} className="p-2 font-medium text-muted-foreground">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={`${row[0]}-${rowIndex}`} className="border-b last:border-0">
                    {row.map((cell, cellIndex) => (
                      <td key={`${rowIndex}-${cellIndex}`} className="p-2">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left">
                {columns.map((column) => (
                  <th key={column} className="p-2 font-medium text-muted-foreground">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${row[0]}-${rowIndex}`} className="border-b last:border-0">
                  {row.map((cell, cellIndex) => (
                    <td key={`${rowIndex}-${cellIndex}`} className="p-2">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination ? (
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>
              Page {pagination.page} of {pagination.totalPages} · {pagination.totalRows} total rows
            </p>
            <div className="flex gap-2">
              {pagination.prevHref ? <Link className="underline" href={pagination.prevHref}>Previous</Link> : null}
              {pagination.nextHref ? <Link className="underline" href={pagination.nextHref}>Next</Link> : null}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
