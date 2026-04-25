import "server-only"

import { cache } from "react"

import type { AppRole } from "@/lib/roles"

export type DashboardMember = {
        name: string
        role: AppRole
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
                        name: "Admin Member",
                        role: "admin",
                        createdAt: new Date().toDateString(),
                        status: "active",
                },
                {
                        name: "Tenant Member",
                        role: "tenant",
                        createdAt: new Date().toDateString(),
                        status: "active",
                },
                {
                        name: "Property Manager",
                        role: "property_manager",
                        createdAt: new Date().toDateString(),
                        status: "resigned",
                },
                {
                        name: "Roommate Member",
                        role: "roommate",
                        createdAt: new Date().toDateString(),
                        status: "active",
                },
        ]
})
