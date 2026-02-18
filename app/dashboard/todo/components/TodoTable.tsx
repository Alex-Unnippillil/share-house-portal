import React from "react"

import Table from "@/components/ui/Table"

import ListOfTodo from "./ListOfTodo"

export default function TodoTable() {
  const tableHeader = ["Title", "Status", "Created at", "Created by"]

  return (
    <Table headers={tableHeader}>
      <ListOfTodo />
    </Table>
  )
}
