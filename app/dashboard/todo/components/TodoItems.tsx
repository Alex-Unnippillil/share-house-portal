"use client"

import { useMemo } from "react"

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"

import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import {
  DASHBOARD_TODO_QUERY_KEY,
  fetchDashboardTodos,
  toggleTodoMutationOptions,
  type DashboardTodo,
} from "@/queries/dashboard-todos"
import { createClient } from "@/utils/supabase-browser"

export function TodoItems() {
  const supabase = useMemo(() => createClient(), [])
  const queryClient = useQueryClient()

  const { data: todos } = useSuspenseQuery({
    queryKey: DASHBOARD_TODO_QUERY_KEY,
    queryFn: () => fetchDashboardTodos(supabase),
  })

  const toggleMutation = useMutation(
    toggleTodoMutationOptions({
      supabase,
      queryClient,
      callbacks: {
        onError: (error) => {
          toast({
            title: "Failed to update todo",
            description: error.message,
            variant: "destructive",
          })
        },
      },
    }),
  )

  return (
    <div className="space-y-4">
      {todos.map((todo) => (
        <TodoRow
          key={todo.id}
          todo={todo}
          onToggle={(completed) => toggleMutation.mutate({ id: todo.id, completed })}
          disabled={toggleMutation.isPending}
        />
      ))}
    </div>
  )
}

function TodoRow({
  todo,
  onToggle,
  disabled,
}: {
  todo: DashboardTodo
  onToggle: (completed: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border/60 px-4 py-3">
      <div className="flex items-center gap-3">
        <Switch
          checked={todo.completed}
          onCheckedChange={onToggle}
          disabled={disabled}
          aria-label={`Mark ${todo.title} as ${todo.completed ? "incomplete" : "complete"}`}
        />
        <h1
          className={cn("text-base font-medium", {
            "line-through text-muted-foreground": todo.completed,
          })}
        >
          {todo.title}
        </h1>
      </div>
    </div>
  )
}
