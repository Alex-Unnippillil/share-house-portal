import { beforeEach, describe, expect, it, vi } from "vitest"

const { revalidatePath, createClient } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  createClient: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath,
}))

vi.mock("@/utils/supabase/server", () => ({
  createClient,
}))

import {
  createTodo,
  deleteTodoById,
  readTodos,
  updateTodoById,
} from "@/app/dashboard/todo/actions"

type Todo = {
  id: string
  title: string
  completed: boolean
  author_id: string
  created_at: string
  updated_at: string
}

function createSupabaseMock(options: {
  userId?: string | null
  todos?: Todo[]
}) {
  const state = {
    todos: [...(options.todos ?? [])],
  }

  const userId = options.userId ?? null

  const client = {
    auth: {
      getUser: vi.fn(async () => ({
        data: {
          user: userId ? { id: userId } : null,
        },
        error: null,
      })),
    },
    from: vi.fn((table: string) => {
      if (table !== "todos") {
        throw new Error(`Unexpected table ${table}`)
      }

      return makeQueryBuilder(state)
    }),
  }

  return { client, state }
}

function makeQueryBuilder(state: { todos: Todo[] }) {
  let mode: "insert" | "update" | "delete" | "read" = "read"
  let payload: Record<string, unknown> | null = null
  const filters = new Map<string, string>()

  const builder = {
    insert(value: Record<string, unknown>) {
      mode = "insert"
      payload = value
      return builder
    },
    update(value: Record<string, unknown>) {
      mode = "update"
      payload = value
      return builder
    },
    delete() {
      mode = "delete"
      return builder
    },
    eq(field: string, value: string) {
      filters.set(field, value)
      return builder
    },
    select(_columns: string) {
      return builder
    },
    single: async () => {
      if (mode !== "insert" || !payload) {
        return { data: null, error: { message: "invalid mode" } }
      }

      const newTodo: Todo = {
        id: "new-todo",
        title: String(payload.title ?? ""),
        completed: Boolean(payload.completed),
        author_id: String(payload.author_id ?? ""),
        created_at: "2026-04-20T00:00:00.000Z",
        updated_at: "2026-04-20T00:00:00.000Z",
      }

      state.todos.push(newTodo)

      return { data: newTodo, error: null }
    },
    then(resolve: (value: { data: Todo[]; error: null }) => void) {
      let data: Todo[] = []

      if (mode === "read") {
        const authorId = filters.get("author_id")
        data = state.todos.filter((todo) => {
          if (authorId && todo.author_id !== authorId) {
            return false
          }

          return true
        })
      }

      if (mode === "update") {
        const id = filters.get("id")
        const authorId = filters.get("author_id")

        state.todos = state.todos.map((todo) => {
          if (todo.id === id && todo.author_id === authorId) {
            const nextTodo = {
              ...todo,
              ...payload,
            } as Todo
            data = [nextTodo]
            return nextTodo
          }

          return todo
        })
      }

      if (mode === "delete") {
        const id = filters.get("id")
        const authorId = filters.get("author_id")
        const remaining: Todo[] = []

        for (const todo of state.todos) {
          if (todo.id === id && todo.author_id === authorId) {
            data = [todo]
            continue
          }

          remaining.push(todo)
        }

        state.todos = remaining
      }

      resolve({ data, error: null })
      return Promise.resolve({ data, error: null })
    },
  }

  return builder
}

describe("todo actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates a todo for the authenticated user", async () => {
    const { client, state } = createSupabaseMock({ userId: "user-1" })
    createClient.mockReturnValue(client)

    const result = await createTodo({ title: "Pay rent", completed: false })

    expect(result.success).toBe(true)
    expect(result.data?.author_id).toBe("user-1")
    expect(state.todos).toHaveLength(1)
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/todo")
  })

  it("lists only the authenticated user's todos", async () => {
    const { client } = createSupabaseMock({
      userId: "user-1",
      todos: [
        {
          id: "todo-1",
          title: "One",
          completed: false,
          author_id: "user-1",
          created_at: "2026-04-20T10:00:00.000Z",
          updated_at: "2026-04-20T10:00:00.000Z",
        },
        {
          id: "todo-2",
          title: "Two",
          completed: false,
          author_id: "user-2",
          created_at: "2026-04-20T11:00:00.000Z",
          updated_at: "2026-04-20T11:00:00.000Z",
        },
      ],
    })
    createClient.mockReturnValue(client)

    const result = await readTodos()

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
    expect(result.data?.[0].author_id).toBe("user-1")
  })

  it("updates only a todo owned by the authenticated user", async () => {
    const { client, state } = createSupabaseMock({
      userId: "user-1",
      todos: [
        {
          id: "todo-1",
          title: "Original",
          completed: false,
          author_id: "user-1",
          created_at: "2026-04-20T10:00:00.000Z",
          updated_at: "2026-04-20T10:00:00.000Z",
        },
      ],
    })
    createClient.mockReturnValue(client)

    const result = await updateTodoById("todo-1", {
      title: "Updated",
      completed: true,
    })

    expect(result.success).toBe(true)
    expect(state.todos[0].title).toBe("Updated")
    expect(state.todos[0].completed).toBe(true)
  })

  it("deletes only a todo owned by the authenticated user", async () => {
    const { client, state } = createSupabaseMock({
      userId: "user-1",
      todos: [
        {
          id: "todo-1",
          title: "Delete me",
          completed: false,
          author_id: "user-1",
          created_at: "2026-04-20T10:00:00.000Z",
          updated_at: "2026-04-20T10:00:00.000Z",
        },
      ],
    })
    createClient.mockReturnValue(client)

    const result = await deleteTodoById("todo-1")

    expect(result.success).toBe(true)
    expect(state.todos).toHaveLength(0)
  })

  it("returns unauthorized for unauthenticated access", async () => {
    const { client } = createSupabaseMock({ userId: null })
    createClient.mockReturnValue(client)

    const createResult = await createTodo({ title: "Task" })
    const readResult = await readTodos()
    const updateResult = await updateTodoById("todo-1", { title: "Nope" })
    const deleteResult = await deleteTodoById("todo-1")

    expect(createResult).toMatchObject({ success: false, error: "Unauthorized" })
    expect(readResult).toMatchObject({ success: false, error: "Unauthorized" })
    expect(updateResult).toMatchObject({ success: false, error: "Unauthorized" })
    expect(deleteResult).toMatchObject({ success: false, error: "Unauthorized" })
  })
})
