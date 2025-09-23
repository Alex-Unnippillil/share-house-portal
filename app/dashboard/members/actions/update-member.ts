'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

interface UpdateMemberNameInput {
  memberId: string
  name: string
}

const updateMemberNameSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(120, 'Name must be 120 characters or fewer'),
})

export async function updateMemberNameAction(input: UpdateMemberNameInput) {
  const validation = updateMemberNameSchema.safeParse(input)

  if (!validation.success) {
    const message = validation.error.errors[0]?.message ?? 'Invalid update request.'
    return { success: false, error: message }
  }

  revalidatePath('/dashboard/members')

  return {
    success: true,
    data: {
      id: validation.data.memberId,
      name: validation.data.name,
    },
  }
}
