import "server-only"

import { cache } from "react"

import { measureDataFetch } from "@/lib/performance/server"

export type DashboardTodo = {
        id: string
        title: string
        createdBy: string
        completed: boolean
}

async function wait(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms))
}

export const getDashboardTodos = cache(async (): Promise<DashboardTodo[]> =>
  measureDataFetch(
    {
      route: "/dashboard/todo",
      detail: "dashboard-todos",
    },
    async () => {
      await wait(200)
      return [
        {
          title: "Subscribe",
          createdBy: "091832901830",
          id: "101981908",
          completed: false,
        },
      ]
    }
  )
)
