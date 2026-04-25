import {
  dashboardEmptyStateClass,
  dashboardStatusBadgeVariants,
} from "@/app/dashboard/components/dashboard-component-variants"
import { TableCell, TableRow } from "@/components/ui/table"

import { readTodos } from "../actions"
import DeleteTodoButton from "./DeleteTodoButton"
import EditTodo from "./EditTodo"

export default async function ListOfTodo() {
  const result = await readTodos()

  if (!result.success) {
    return (
      <tbody>
        <tr>
          <td colSpan={5} className="p-2">
            <div className={dashboardEmptyStateClass}>{result.error ?? "Unable to load todos."}</div>
          </td>
        </tr>
      </tbody>
    )
  }

  const todos = result.data ?? []

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
        <TableRow key={todo.id} className={index === 0 ? "bg-muted/40" : undefined}>
          <TableCell className="font-medium text-foreground">{todo.title}</TableCell>
          <TableCell>
            <span
              className={dashboardStatusBadgeVariants({
                tone: todo.completed ? "success" : "warning",
              })}
            >
              {todo.completed ? "completed" : "pending"}
            </span>
          </TableCell>
          <TableCell className="text-muted-foreground">
            {todo.created_at ? new Date(todo.created_at).toLocaleDateString() : "-"}
          </TableCell>
          <TableCell className="text-muted-foreground">{todo.author_id}</TableCell>
          <TableCell className="text-right">
            <div className="flex items-center justify-end gap-2">
              <DeleteTodoButton todoId={todo.id} />
              <EditTodo todo={todo} />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </tbody>
  )
}
