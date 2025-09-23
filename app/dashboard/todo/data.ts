import "server-only"

import { cache } from "react"

export type DashboardTodo = {
        id: string
        title: string
        createdBy: string
        completed: boolean
}

async function wait(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms))
}

export const getDashboardTodos = cache(async (): Promise<DashboardTodo[]> => {
        await wait(200)
        return [
                {
                        title: "Subscribe",
                        createdBy: "091832901830",
                        id: "101981908",
                        completed: false,
                },
        ]
})
