import "server-only"

import { cache } from "react"

export type DashboardMember = {
        id: string
        name: string
        role: "admin" | "user"
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
                        id: "member-admin-1",
                        name: "Admin Member",
                        role: "admin",
                        createdAt: new Date().toDateString(),
                        status: "active",
                },
                {
                        id: "member-user-1",
                        name: "Non Admin User",
                        role: "user",
                        createdAt: new Date().toDateString(),
                        status: "active",
                },
                {
                        id: "member-admin-2",
                        name: "Administrator",
                        role: "admin",
                        createdAt: new Date().toDateString(),
                        status: "resigned",
                },
                {
                        id: "member-user-2",
                        name: "Satoshi",
                        role: "user",
                        createdAt: new Date().toDateString(),
                        status: "active",
                },
        ]
})
