export interface TodoRecord {
  id: string
  title: string
  createdBy: string
  completed: boolean
  createdAt: string
}

const TODO_DIRECTORY: TodoRecord[] = [
  {
    id: "todo_subscribe",
    title: "Subscribe",
    createdBy: "091832901830",
    completed: false,
    createdAt: "2024-05-01T08:30:00.000Z",
  },
  {
    id: "todo_pay_rent",
    title: "Pay rent", 
    createdBy: "tenant_102",
    completed: false,
    createdAt: "2024-05-28T10:00:00.000Z",
  },
  {
    id: "todo_buy_supplies",
    title: "Buy household supplies",
    createdBy: "tenant_204",
    completed: true,
    createdAt: "2024-04-15T12:15:00.000Z",
  },
  {
    id: "todo_schedule_cleanup",
    title: "Schedule weekend cleanup",
    createdBy: "tenant_305",
    completed: false,
    createdAt: "2024-06-05T09:45:00.000Z",
  },
  {
    id: "todo_review_utilities",
    title: "Review utilities budget",
    createdBy: "tenant_410",
    completed: true,
    createdAt: "2024-05-10T14:00:00.000Z",
  },
]

export async function searchTodos(query?: string) {
  if (!query) {
    return TODO_DIRECTORY.map((todo) => ({ ...todo }))
  }

  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return TODO_DIRECTORY.map((todo) => ({ ...todo }))
  }

  const filtered = TODO_DIRECTORY.filter((todo) =>
    todo.title.toLowerCase().includes(normalized) ||
    todo.createdBy.toLowerCase().includes(normalized),
  )

  return filtered.map((todo) => ({ ...todo }))
}
