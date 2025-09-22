"use client"

import { useCallback, useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useToast } from "@/components/ui/use-toast"
import type { Database } from "@/lib/supabase"
import { createClient } from "@/utils/supabase-browser"

type Todo = Database["public"]["Tables"]["todos"]["Row"]

function mapTodo(todo: Todo): Todo {
  return {
    ...todo,
    completed: Boolean(todo.completed),
  }
}

export function useTodos() {
  const supabase = useMemo(() => createClient(), [])
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const todosQuery = useQuery({
    queryKey: ["todos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("todos")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      return (data ?? []).map(mapTodo) as Todo[]
    },
    staleTime: 30_000,
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Unable to load todos."
      toast({
        title: "Failed to load todos",
        description: message,
        variant: "destructive",
      })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { data, error } = await (supabase as any)
        .from("todos")
        .update({ completed })
        .eq("id", id)
        .select("*")
        .single()

      if (error) {
        throw error
      }

      return mapTodo(data as Todo)
    },
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: ["todos"] })

      const previousTodos = queryClient.getQueryData<Todo[]>(["todos"])

      queryClient.setQueryData<Todo[]>(["todos"], (old) =>
        (old ?? []).map((todo) =>
          todo.id === id
            ? {
                ...todo,
                completed,
              }
            : todo,
        ),
      )

      return { previousTodos }
    },
    onError: (error, _variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(["todos"], context.previousTodos)
      }

      toast({
        title: "Unable to update todo",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    },
    onSuccess: (updatedTodo) => {
      queryClient.setQueryData<Todo[]>(["todos"], (old) =>
        (old ?? []).map((todo) =>
          todo.id === updatedTodo.id
            ? {
                ...todo,
                ...updatedTodo,
              }
            : todo,
        ),
      )

      toast({
        title: updatedTodo.completed ? "Todo completed" : "Todo reopened",
        description: updatedTodo.title,
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] })
    },
  })

  const toggleTodo = useCallback(
    (id: string) => {
      const existingTodos = queryClient.getQueryData<Todo[]>(["todos"]) ?? []
      const target = existingTodos.find((todo) => todo.id === id)

      if (!target) {
        toast({
          title: "Todo not found",
          description: "The requested todo could not be located.",
          variant: "destructive",
        })
        return
      }

      toggleMutation.mutate({ id, completed: !target.completed })
    },
    [queryClient, toast, toggleMutation],
  )

  return {
    todos: todosQuery.data ?? [],
    isLoading: todosQuery.isLoading,
    toggleTodo,
    togglingId: toggleMutation.variables?.id ?? null,
  }
}
