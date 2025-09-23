import "server-only"

import { cache } from "react"

import type { Database } from "@/lib/supabase"
import { createSupbaseServerClientReadOnly } from "@/utils/supaone"

export type DashboardTodo = {
  id: string
  title: string
  createdBy: string
  completed: boolean
  createdAt: string
}

type TodoRow = Database["public"]["Tables"]["dashboard_todos"]["Row"]

const FALLBACK_TODOS: DashboardTodo[] = [
  {
    id: "fallback-todo-1",
    title: "Subscribe",
    createdBy: "091832901830",
    completed: false,
    createdAt: new Date().toISOString(),
  },
]

export function mapTodoRowToDashboard(row: TodoRow): DashboardTodo {
  return {
    id: row.id,
    title: row.title,
    createdBy: row.created_by,
    completed: row.completed,
    createdAt: row.created_at ?? new Date().toISOString(),
  }
}

export const getDashboardTodos = cache(async (): Promise<DashboardTodo[]> => {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return FALLBACK_TODOS
  }

  try {
    const supabase = await createSupbaseServerClientReadOnly()
    const { data, error } = await supabase
      .from("dashboard_todos")
      .select("*")
      .order("created_at", { ascending: false })

    if (error || !data?.length) {
      if (error) {
        console.error("Failed to load dashboard todos from Supabase", error)
      }
      return FALLBACK_TODOS
    }

    return data.map(mapTodoRowToDashboard)
  } catch (error) {
    console.error("Unexpected error loading dashboard todos", error)
    return FALLBACK_TODOS
  }
})
