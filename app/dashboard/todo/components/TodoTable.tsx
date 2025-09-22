import React from "react"
import ListOfTodo, { defaultTodos } from "./ListOfTodo"
import Table from "@/components/ui/Table"
import type { DashboardTodoRecord } from "@/types/perf"

interface TodoTableProps {
  todos?: DashboardTodoRecord[]
}

export default function TodoTable({ todos = defaultTodos }: TodoTableProps) {
  const tableHeader = ["Title", "Status", "Created at", "Created by"]

  return (
    <Table headers={tableHeader}>
      <ListOfTodo todos={todos} />
    </Table>
  )
}
