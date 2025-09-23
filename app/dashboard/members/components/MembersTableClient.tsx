"use client"

import { useMemo } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { TrashIcon } from "@radix-ui/react-icons"

import Table from "@/components/ui/Table"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { DashboardMember } from "../data"
import EditMember from "./edit/EditMember"

const roleClassNames: Record<DashboardMember["role"], string> = {
  admin: "border-green-500/70 bg-emerald-50 text-emerald-700 dark:border-emerald-400/60 dark:bg-emerald-500/10 dark:text-emerald-200",
  user: "border-yellow-500/50 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
}

const statusClassNames: Record<DashboardMember["status"], string> = {
  active: "border-emerald-500/70 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200",
  resigned: "border-red-500/60 bg-rose-50 text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200",
}

interface MembersTableClientProps {
  data: DashboardMember[]
  tableId: string
}

export function MembersTableClient({ data, tableId }: MembersTableClientProps) {
  const columns = useMemo<ColumnDef<DashboardMember>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.name}</span>
        ),
        size: 220,
        meta: {
          cellClassName: "whitespace-nowrap",
        },
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => (
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize shadow-sm",
              roleClassNames[row.original.role],
            )}
          >
            {row.original.role}
          </span>
        ),
        size: 160,
      },
      {
        accessorKey: "createdAt",
        header: "Joined",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.createdAt}</span>
        ),
        size: 200,
        meta: {
          cellClassName: "whitespace-nowrap",
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize shadow-sm",
              statusClassNames[row.original.status],
            )}
          >
            {row.original.status}
          </span>
        ),
        size: 160,
      },
      {
        id: "actions",
        header: "Actions",
        enableResizing: false,
        cell: () => (
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <TrashIcon className="size-3.5" />
              Delete
            </Button>
            <EditMember />
          </div>
        ),
        meta: {
          headerClassName: "text-right",
          cellClassName: "text-right",
        },
        size: 220,
      },
    ],
    [],
  )

  return (
    <Table
      columns={columns}
      data={data}
      tableId={tableId}
      emptyState="No members found."
    />
  )
}
