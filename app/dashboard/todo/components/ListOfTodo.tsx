import { TrashIcon } from "@radix-ui/react-icons"

import {
  dashboardEmptyStateClass,
  dashboardStatusBadgeVariants,
} from "@/app/dashboard/components/dashboard-component-variants"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"

import EditTodo from "./EditTodo"

type TodoRow = {
  title: string
  status: "completed" | "pending"
  createdAt: string
  createdBy: string
}

const todos: TodoRow[] = [
  {
    title: "Subscribe to my channel",
    status: "completed",
    createdAt: new Date().toDateString(),
    createdBy: "Garfield",
  },
  {
    title: "Prepare parking rules announcement",
    status: "pending",
    createdAt: new Date().toDateString(),
    createdBy: "Trender",
  },
]

export default function ListOfTodo() {
  if (!todos.length) {
    return (
      <tbody>
        <tr>
          <td colSpan={5} className="p-2">
            <div className={dashboardEmptyStateClass}>No todos yet. Create one to get started.</div>
          </td>
        </tr>
      </tbody>
    )
  }

  return (
    <tbody>
      {todos.map((todo, index) => (
        <TableRow key={todo.title + index} className={index === 0 ? "bg-muted/40" : undefined}>
          <TableCell className="font-medium text-foreground">{todo.title}</TableCell>
          <TableCell>
            <span
              className={dashboardStatusBadgeVariants({
                tone: todo.status === "completed" ? "success" : "warning",
              })}
            >
              {todo.status}
            </span>
          </TableCell>
          <TableCell className="text-muted-foreground">{todo.createdAt}</TableCell>
          <TableCell className="text-muted-foreground">{todo.createdBy}</TableCell>
          <TableCell className="text-right">
            <div className="flex items-center justify-end gap-2">
              <Button size="sm" variant="outline" className="gap-2">
                <TrashIcon />
                Delete
              </Button>
              <EditTodo />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </tbody>
  )
}
