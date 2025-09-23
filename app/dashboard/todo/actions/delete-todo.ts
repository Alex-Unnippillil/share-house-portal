"use server"

import { revalidatePath } from "next/cache"

import { DASHBOARD_UNDO_WINDOW_MS } from "@/app/dashboard/constants"
import type { Database } from "@/lib/supabase"
import { createSupbaseServerClient } from "@/utils/supaone"

import type { DashboardTodo } from "../data"
import { mapTodoRowToDashboard } from "../data"

const ENTITY = "dashboard_todos"

type TodoRow = Database["public"]["Tables"]["dashboard_todos"]["Row"]

type DeletionEventInsert = Database["public"]["Tables"]["deletion_events"]["Insert"]

function asDeletionEvent(row: TodoRow, recordId: string): DeletionEventInsert {
  return {
    entity: ENTITY,
    record_id: recordId,
    payload: row,
    expires_at: new Date(Date.now() + DASHBOARD_UNDO_WINDOW_MS).toISOString(),
  }
}

export async function deleteTodo(id: string): Promise<DashboardTodo> {
  const supabase = await createSupbaseServerClient()

  const { data: deleted, error } = await supabase
    .from(ENTITY)
    .delete()
    .eq("id", id)
    .select("*")
    .single()

  if (error || !deleted) {
    throw new Error(error?.message ?? "Unable to delete todo item")
  }

  const { error: logError } = await supabase
    .from("deletion_events")
    .insert(asDeletionEvent(deleted, id))

  if (logError) {
    throw new Error(logError.message)
  }

  revalidatePath("/dashboard/todo")
  return mapTodoRowToDashboard(deleted)
}

export async function restoreTodo(todo: DashboardTodo) {
  const supabase = await createSupbaseServerClient()

  const { data, error } = await supabase
    .from(ENTITY)
    .upsert(
      {
        id: todo.id,
        title: todo.title,
        created_by: todo.createdBy,
        completed: todo.completed,
        created_at: todo.createdAt,
      },
      { onConflict: "id" }
    )
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to restore todo item")
  }

  const { error: cleanupError } = await supabase
    .from("deletion_events")
    .delete()
    .match({ entity: ENTITY, record_id: todo.id })

  if (cleanupError) {
    throw new Error(cleanupError.message)
  }

  revalidatePath("/dashboard/todo")

  return mapTodoRowToDashboard(data)
}
