'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

interface UpdateTodoTitleInput {
  todoId: string
  title: string
}

const updateTodoTitleSchema = z.object({
  todoId: z.string().min(1, 'Todo ID is required'),
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(160, 'Title must be 160 characters or fewer'),
})

export async function updateTodoTitleAction(input: UpdateTodoTitleInput) {
  const validation = updateTodoTitleSchema.safeParse(input)

  if (!validation.success) {
    const message = validation.error.errors[0]?.message ?? 'Invalid update request.'
    return { success: false, error: message }
  }

  revalidatePath('/dashboard/todo')

  return {
    success: true,
    data: {
      id: validation.data.todoId,
      title: validation.data.title,
    },
  }
}
