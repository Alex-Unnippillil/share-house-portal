"use server"

import { z } from "zod"

import type { DashboardMember } from "../data"

export async function createMember() {
        console.log("create member")
}

export async function updateMemberById(id: string) {
        console.log("update member", id)
}

export async function deleteMemberById(id: string) {
        console.log("delete member", id)
}

export async function readMembers() {
        console.log("read members")
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const patchMemberSchema = z.object({
        id: z.string().min(1, "Member id is required"),
        updates: z
                .object({
                        role: z.enum(["admin", "user"]).optional(),
                        status: z.enum(["active", "resigned"]).optional(),
                })
                .refine((value) => value.role !== undefined || value.status !== undefined, {
                        message: "Provide at least one field to update",
                }),
})

export type PatchMemberInput = z.infer<typeof patchMemberSchema>

export type PatchMemberResult = {
        id: string
        role?: DashboardMember["role"]
        status?: DashboardMember["status"]
}

export async function patchMember(input: PatchMemberInput): Promise<PatchMemberResult> {
        const payload = patchMemberSchema.parse(input)

        await wait(120)

        return {
                id: payload.id,
                ...payload.updates,
        }
}
