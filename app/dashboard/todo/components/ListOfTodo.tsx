import { TrashIcon } from "@radix-ui/react-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  dashboardEmptyStateClass,
  dashboardStatusBadgeVariants,
  dashboardTableContainerClass,
  dashboardTableRowVariants,
} from "@/app/dashboard/components/dashboard-component-variants"

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
      <div className={dashboardEmptyStateClass}>
        No todos yet. Create one to get started.
      </div>
    )
  }

  return (
    <div className={cn(dashboardTableContainerClass, "mx-2")}>
      {todos.map((todo, index) => (
        <div
          key={todo.title + index}
          className={dashboardTableRowVariants({ active: index === 0 })}
        >
          <p className="font-medium text-foreground">{todo.title}</p>
          <div>
            <span
              className={dashboardStatusBadgeVariants({
                tone: todo.status === "completed" ? "success" : "warning",
              })}
            >
              {todo.status}
            </span>
          </div>
          <p className="text-muted-foreground">{todo.createdAt}</p>
          <p className="text-muted-foreground">{todo.createdBy}</p>
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="outline" className="gap-2">
              <TrashIcon />
              Delete
            </Button>
            <EditTodo />
          </div>
        </div>
      ))}
    </div>
  )
}
