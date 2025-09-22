import "server-only"

import { cache } from "react"

import type { MemberRole } from "@/lib/members"

export type DashboardMember = {
        name: string
        role: MemberRole
        persona: "resident" | "management"
        createdAt: string
        status: "active" | "resigned"
}

async function wait(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms))
}

export const getDashboardMembers = cache(async (): Promise<DashboardMember[]> => {
        await wait(260)
        return [
                {
                        name: "Avery Chen",
                        role: "tenant",
                        persona: "resident",
                        createdAt: new Date().toDateString(),
                        status: "active",
                },
                {
                        name: "Jordan Blake",
                        role: "roommate",
                        persona: "resident",
                        createdAt: new Date().toDateString(),
                        status: "resigned",
                },
                {
                        name: "Morgan Ellis",
                        role: "property_manager",
                        persona: "management",
                        createdAt: new Date().toDateString(),
                        status: "active",
                },
                {
                        name: "Sonia Patel",
                        role: "landlord",
                        persona: "management",
                        createdAt: new Date().toDateString(),
                        status: "active",
                },
        ]
})
