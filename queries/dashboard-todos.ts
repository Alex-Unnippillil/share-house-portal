import type { QueryClient, UseMutationOptions } from "@tanstack/react-query"

import type { Database } from "@/lib/supabase"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

export type DashboardTodo = Database["public"]["Tables"]["todos"]["Row"]

export const DASHBOARD_TODO_QUERY_KEY = ["dashboard", "todos"] as const

function buildError(message: string) {
  return new Error(message)
}

export async function fetchDashboardTodos(
  supabase: TypedSupabaseClient,
): Promise<DashboardTodo[]> {
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    throw buildError(`Failed to load todos: ${error.message}`)
  }

  return data ?? []
}

export type CreateTodoVariables = { title: string }

export type CreateTodoContext = {
  previousTodos: DashboardTodo[]
  optimisticTodo: DashboardTodo
}

export type ToggleTodoVariables = { id: string; completed: boolean }

export type ToggleTodoContext = {
  previousTodos: DashboardTodo[]
}

type MutationCallbacks<TData, TContext> = {
  onError?: (error: Error, context: TContext | undefined) => void
  onSuccess?: (data: TData, context: TContext | undefined) => void
}

export function createTodoMutationOptions({
  supabase,
  queryClient,
  callbacks = {},
}: {
  supabase: TypedSupabaseClient
  queryClient: QueryClient
  callbacks?: MutationCallbacks<DashboardTodo, CreateTodoContext>
}): UseMutationOptions<DashboardTodo, Error, CreateTodoVariables, CreateTodoContext> {
  return {
    mutationKey: ["create", ...DASHBOARD_TODO_QUERY_KEY],
    mutationFn: async ({ title }) => {
      const { data, error } = await supabase
        .from("todos")
        .insert({ title })
        .select()
        .single()

      if (error || !data) {
        throw buildError(error?.message ?? "Failed to create todo")
      }

      return data
    },
    onMutate: async ({ title }) => {
      await queryClient.cancelQueries({ queryKey: DASHBOARD_TODO_QUERY_KEY })

      const previousTodos =
        queryClient.getQueryData<DashboardTodo[]>(DASHBOARD_TODO_QUERY_KEY) ?? []

      const optimisticTodo: DashboardTodo = {
        id: `optimistic-${Date.now()}`,
        title,
        completed: false,
        created_at: new Date().toISOString(),
      }

      queryClient.setQueryData<DashboardTodo[]>(
        DASHBOARD_TODO_QUERY_KEY,
        (current = []) => [optimisticTodo, ...current],
      )

      return { previousTodos, optimisticTodo }
    },
    onError: (error, _variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(DASHBOARD_TODO_QUERY_KEY, context.previousTodos)
      }

      callbacks.onError?.(error, context)
    },
    onSuccess: (createdTodo, _variables, context) => {
      if (context?.optimisticTodo) {
        queryClient.setQueryData<DashboardTodo[]>(
          DASHBOARD_TODO_QUERY_KEY,
          (current = []) =>
            current.map((todo) =>
              todo.id === context.optimisticTodo.id ? createdTodo : todo,
            ),
        )
      }

      callbacks.onSuccess?.(createdTodo, context)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DASHBOARD_TODO_QUERY_KEY })
    },
  }
}

export function toggleTodoMutationOptions({
  supabase,
  queryClient,
  callbacks = {},
}: {
  supabase: TypedSupabaseClient
  queryClient: QueryClient
  callbacks?: MutationCallbacks<DashboardTodo, ToggleTodoContext>
}): UseMutationOptions<DashboardTodo, Error, ToggleTodoVariables, ToggleTodoContext> {
  return {
    mutationKey: ["toggle", ...DASHBOARD_TODO_QUERY_KEY],
    mutationFn: async ({ id, completed }) => {
      const { data, error } = await supabase
        .from("todos")
        .update({ completed })
        .eq("id", id)
        .select()
        .single()

      if (error || !data) {
        throw buildError(error?.message ?? "Failed to update todo")
      }

      return data
    },
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: DASHBOARD_TODO_QUERY_KEY })

      const previousTodos =
        queryClient.getQueryData<DashboardTodo[]>(DASHBOARD_TODO_QUERY_KEY) ?? []

      queryClient.setQueryData<DashboardTodo[]>(
        DASHBOARD_TODO_QUERY_KEY,
        (current = []) =>
          current.map((todo) =>
            todo.id === id ? { ...todo, completed } : todo,
          ),
      )

      return { previousTodos }
    },
    onError: (error, _variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(DASHBOARD_TODO_QUERY_KEY, context.previousTodos)
      }

      callbacks.onError?.(error, context)
    },
    onSuccess: (updatedTodo, _variables, context) => {
      queryClient.setQueryData<DashboardTodo[]>(
        DASHBOARD_TODO_QUERY_KEY,
        (current = []) =>
          current.map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo)),
      )

      callbacks.onSuccess?.(updatedTodo, context)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DASHBOARD_TODO_QUERY_KEY })
    },
  }
}
