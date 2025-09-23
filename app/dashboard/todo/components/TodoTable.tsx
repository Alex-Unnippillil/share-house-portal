"use client"

import { useMemo } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { TrashIcon } from "@radix-ui/react-icons"

import Table from "@/components/ui/Table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import EditTodo from "./EditTodo"

type TodoItem = {
  title: string
  status: "completed" | "in-progress"
  created_at: string
  create_by: string
}

const todos: TodoItem[] = [
  {
    title: "Subscribe to my channel",
    status: "completed",
    created_at: new Date().toDateString(),
    create_by: "Garfield",
  },
  {
    title: "Subscribe to my channel",
    status: "completed",
    created_at: new Date().toDateString(),
    create_by: "Trender",
  },
  {
    title: "Subscribe to my channel",
    status: "completed",
    created_at: new Date().toDateString(),
    create_by: "Some string",
  },
]

const statusVariants: Record<TodoItem["status"], string> = {
  completed: "border-emerald-500/60 bg-emerald-50 text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-200",
  "in-progress": "border-amber-500/60 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
}

export default function TodoTable() {
  const columns = useMemo<ColumnDef<TodoItem>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
        size: 280,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium capitalize",
              statusVariants[row.original.status],
            )}
          >
            {row.original.status.replace("-", " ")}
          </Badge>
        ),
        size: 160,
      },
      {
        accessorKey: "created_at",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.created_at}</span>
        ),
        size: 200,
        meta: {
          cellClassName: "whitespace-nowrap",
        },
      },
      {
        accessorKey: "create_by",
        header: "Created By",
        cell: ({ row }) => <span>{row.original.create_by}</span>,
        size: 180,
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
            <EditTodo />
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

  return <Table columns={columns} data={todos} tableId="dashboard-todos" emptyState="No todos found." />
}
