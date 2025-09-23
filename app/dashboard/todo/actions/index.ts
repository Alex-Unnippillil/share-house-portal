"use server"

import { z } from "zod"

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const patchTodoSchema = z.object({
        id: z.string().min(1, "Todo id is required"),
        updates: z.object({
                status: z.enum(["completed", "pending", "in_progress"]),
        }),
})

export type PatchTodoInput = z.infer<typeof patchTodoSchema>

export type PatchTodoResult = PatchTodoInput["updates"] & { id: string }

export async function patchTodo(input: PatchTodoInput): Promise<PatchTodoResult> {
        const payload = patchTodoSchema.parse(input)

        await wait(120)

        return {
                id: payload.id,
                ...payload.updates,
        }
}
