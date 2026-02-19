import ListOfTodo from "./ListOfTodo"
import Table, { TableHeader } from "@/components/ui/table"

export default function TodoTable() {
  return (
    <Table stickyHeader density="compact">
      <thead>
        <tr>
          <TableHeader>Title</TableHeader>
          <TableHeader>Status</TableHeader>
          <TableHeader>Created at</TableHeader>
          <TableHeader>Created by</TableHeader>
          <TableHeader className="text-right">Actions</TableHeader>
        </tr>
      </thead>
      <ListOfTodo />
    </Table>
  )
}
