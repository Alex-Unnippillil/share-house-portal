import "server-only"

import { cache } from "react"

import { fetchDashboardTodos, type DashboardTodo } from "@/queries/dashboard-todos"
import { createSupbaseServerClientReadOnly } from "@/utils/supaone"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

export const getDashboardTodos = cache(async (): Promise<DashboardTodo[]> => {
  const supabase = (await createSupbaseServerClientReadOnly()) as TypedSupabaseClient
  return fetchDashboardTodos(supabase)
})
