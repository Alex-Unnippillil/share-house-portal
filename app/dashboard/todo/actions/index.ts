"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/utils/supabase/server"

export type TodoRecord = {
  id: string
  title: string
  completed: boolean
  author_id: string
  created_at: string | null
  updated_at: string | null
}

type TodoActionResult<T> = {
  success: boolean
  data?: T
  error?: string
}

function unauthorizedResult<T>(): TodoActionResult<T> {
  return {
    success: false,
    error: "Unauthorized",
  }
}

export async function createTodo(input: {
  title: string
  completed?: boolean
}): Promise<TodoActionResult<TodoRecord>> {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return unauthorizedResult()
  }

  const { data, error } = await supabase
    .from("todos")
    .insert({
      title: input.title,
      completed: input.completed ?? false,
      author_id: user.id,
    })
    .select("id, title, completed, author_id, created_at, updated_at")
    .single()

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to create todo",
    }
  }

  revalidatePath("/dashboard/todo")

  return {
    success: true,
    data: data as TodoRecord,
  }
}

export async function updateTodoById(
  id: string,
  input: {
    title?: string
    completed?: boolean
  },
): Promise<TodoActionResult<TodoRecord>> {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return unauthorizedResult()
  }

  const payload: { title?: string; completed?: boolean; updated_at: string } = {
    updated_at: new Date().toISOString(),
  }

  if (typeof input.title === "string") {
    payload.title = input.title
  }

  if (typeof input.completed === "boolean") {
    payload.completed = input.completed
  }

  const { data, error } = await supabase
    .from("todos")
    .update(payload)
    .eq("id", id)
    .eq("author_id", user.id)
    .select("id, title, completed, author_id, created_at, updated_at")

  if (error) {
    return {
      success: false,
      error: error.message,
    }
  }

  const todo = (data as TodoRecord[] | null)?.[0]

  if (!todo) {
    return {
      success: false,
      error: "Todo not found",
    }
  }

  revalidatePath("/dashboard/todo")

  return {
    success: true,
    data: todo,
  }
}

export async function deleteTodoById(id: string): Promise<TodoActionResult<{ id: string }>> {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return unauthorizedResult()
  }

  const { data, error } = await supabase
    .from("todos")
    .delete()
    .eq("id", id)
    .eq("author_id", user.id)
    .select("id")

  if (error) {
    return {
      success: false,
      error: error.message,
    }
  }

  const deletedTodo = (data as { id: string }[] | null)?.[0]

  if (!deletedTodo) {
    return {
      success: false,
      error: "Todo not found",
    }
  }

  revalidatePath("/dashboard/todo")

  return {
    success: true,
    data: deletedTodo,
  }
}

export async function readTodos(): Promise<TodoActionResult<TodoRecord[]>> {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return unauthorizedResult()
  }

  const { data, error } = await supabase
    .from("todos")
    .select("id, title, completed, author_id, created_at, updated_at")
    .eq("author_id", user.id)

  if (error) {
    return {
      success: false,
      error: error.message,
    }
  }

  const todos = ((data as TodoRecord[] | null) ?? []).sort((a, b) => {
    const left = a.created_at ? new Date(a.created_at).getTime() : 0
    const right = b.created_at ? new Date(b.created_at).getTime() : 0

    return right - left
  })

  return {
    success: true,
    data: todos,
  }
}
