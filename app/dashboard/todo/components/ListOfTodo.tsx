"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTodos } from "@/hooks/use-todos";
import { cn } from "@/lib/utils";

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

export default function ListOfTodo() {
  const { todos, isLoading, toggleTodo, togglingId } = useTodos();

  if (isLoading) {
    return (
      <div className="px-5 py-4 text-sm text-muted-foreground">
        Loading todos...
      </div>
    );
  }

  if (todos.length === 0) {
    return (
      <div className="px-5 py-4 text-sm text-muted-foreground">
        No todos yet.
      </div>
    );
  }

  return (
    <>
      {todos.map((todo) => {
        const isToggling = togglingId === todo.id;

        return (
          <div
            className="grid grid-cols-5 items-center rounded-sm px-5 py-3 text-sm"
            key={todo.id}
          >
            <span className="font-medium dark:text-white">{todo.title}</span>
            <div>
              <Badge
                variant="outline"
                className={cn(
                  "w-fit capitalize",
                  todo.completed
                    ? "border-green-200 bg-green-100 text-green-700"
                    : "border-amber-200 bg-amber-100 text-amber-700",
                )}
              >
                {todo.completed ? "completed" : "pending"}
              </Badge>
            </div>
            <span className="text-muted-foreground">
              {formatDate(todo.created_at)}
            </span>
            <span className="text-muted-foreground">
              {todo.created_by || "—"}
            </span>
            <div className="flex justify-end">
              <Button
                size="sm"
                variant={todo.completed ? "outline" : "default"}
                onClick={() => toggleTodo(todo.id)}
                disabled={isToggling}
              >
                {isToggling
                  ? "Saving..."
                  : todo.completed
                  ? "Mark pending"
                  : "Mark done"}
              </Button>
            </div>
          </div>
        );
      })}
    </>
  );
}