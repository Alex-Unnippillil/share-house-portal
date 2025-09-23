import "server-only"

import { cache } from "react"

import { measureDataFetch } from "@/lib/performance/server"

export type DashboardMember = {
        name: string
        role: "admin" | "user"
        createdAt: string
        status: "active" | "resigned"
}

async function wait(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms))
}

export const getDashboardMembers = cache(async (): Promise<DashboardMember[]> =>
  measureDataFetch(
    {
      route: "/dashboard/members",
      detail: "dashboard-members",
    },
    async () => {
      await wait(260)
      return [
        {
          name: "Admin Member",
          role: "admin",
          createdAt: new Date().toDateString(),
          status: "active",
        },
        {
          name: "Non Admin User",
          role: "user",
          createdAt: new Date().toDateString(),
          status: "active",
        },
        {
          name: "Administrator",
          role: "admin",
          createdAt: new Date().toDateString(),
          status: "resigned",
        },
        {
          name: "Satoshi",
          role: "user",
          createdAt: new Date().toDateString(),
          status: "active",
        },
      ]
    }
  )
)
