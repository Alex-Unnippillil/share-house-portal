import { describe, expect, it } from "vitest"
import { QueryClient } from "@tanstack/react-query"

import {
  DASHBOARD_TODO_QUERY_KEY,
  createTodoMutationOptions,
  toggleTodoMutationOptions,
  type DashboardTodo,
} from "@/queries/dashboard-todos"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

describe("dashboard todo optimistic workflows", () => {
  it("shows newly created todos immediately while awaiting Supabase", async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(DASHBOARD_TODO_QUERY_KEY, [])

    const serverTodo: DashboardTodo = {
      id: "server-1",
      title: "Schedule chore rotation",
      completed: false,
      created_at: new Date().toISOString(),
    }

    const supabase = {
      from: () => ({
        insert: () => ({
          select: () => ({
            single: async () => ({ data: serverTodo, error: null }),
          }),
        }),
      }),
    } as unknown as TypedSupabaseClient

    const options = createTodoMutationOptions({ supabase, queryClient })

    const context = await options.onMutate?.({ title: serverTodo.title })

    const optimistic = queryClient.getQueryData<DashboardTodo[]>(
      DASHBOARD_TODO_QUERY_KEY,
    )

    expect(optimistic?.[0]?.title).toBe(serverTodo.title)
    expect(optimistic?.[0]?.id.startsWith("optimistic-")).toBe(true)

    options.onSuccess?.(serverTodo, { title: serverTodo.title }, context)

    const finalTodos = queryClient.getQueryData<DashboardTodo[]>(
      DASHBOARD_TODO_QUERY_KEY,
    )

    expect(finalTodos).toEqual([serverTodo])
    queryClient.clear()
  })

  it("reverts switch toggles when Supabase rejects the update", async () => {
    const queryClient = new QueryClient()
    const originalTodo: DashboardTodo = {
      id: "todo-1",
      title: "Replace air filters",
      completed: false,
      created_at: new Date().toISOString(),
    }

    queryClient.setQueryData(DASHBOARD_TODO_QUERY_KEY, [originalTodo])

    const supabase = {
      from: () => ({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({
                data: null,
                error: { message: "Permission denied" },
              }),
            }),
          }),
        }),
      }),
    } as unknown as TypedSupabaseClient

    const options = toggleTodoMutationOptions({ supabase, queryClient })

    const context = await options.onMutate?.({
      id: originalTodo.id,
      completed: true,
    })

    const optimistic = queryClient.getQueryData<DashboardTodo[]>(
      DASHBOARD_TODO_QUERY_KEY,
    )
    expect(optimistic?.[0]?.completed).toBe(true)

    options.onError?.(
      new Error("Permission denied"),
      { id: originalTodo.id, completed: true },
      context,
    )

    const reconciled = queryClient.getQueryData<DashboardTodo[]>(
      DASHBOARD_TODO_QUERY_KEY,
    )
    expect(reconciled?.[0]).toEqual(originalTodo)

    queryClient.clear()
  })
})
