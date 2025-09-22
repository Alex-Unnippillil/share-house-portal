import { Button } from "@/components/ui/button"
import type { TodoRecord } from "@/lib/data/todos"
import { cn } from "@/lib/utils"

interface TodoListProps {
  todos: TodoRecord[]
  searchQuery?: string
}

export default function TodoList({ todos, searchQuery }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {searchQuery?.trim()
          ? `No to-dos found for "${searchQuery.trim()}".`
          : "No to-dos are available yet."}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {todos.map((todo) => (
        <div key={todo.id} className="flex items-center gap-6">
          <div className="flex-1">
            <h1 className={cn("font-medium", { "line-through": todo.completed })}>{todo.title}</h1>
            <p className="text-xs text-muted-foreground">Created by {todo.createdBy}</p>
          </div>
          <Button variant="outline">delete</Button>
          <Button variant="outline">Update</Button>
        </div>
      ))}
    </div>
  )
}
