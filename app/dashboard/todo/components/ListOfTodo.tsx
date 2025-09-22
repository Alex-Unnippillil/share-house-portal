import React from "react"
import { TrashIcon } from "@radix-ui/react-icons"
import { Button } from "@/components/ui/button"
import EditTodo from "./EditTodo"
import { cn } from "@/lib/utils"
import type { DashboardTodoRecord } from "@/types/perf"

export const defaultTodos: DashboardTodoRecord[] = [
  { title: "Subscribe", status: "completed", created_at: "2023-05-01", create_by: "091832901830" },
  { title: "Follow on socials", status: "completed", created_at: "2023-05-02", create_by: "Trender" },
  { title: "Share with friends", status: "completed", created_at: "2023-05-03", create_by: "Some string" },
]

interface ListOfTodoProps {
  todos?: DashboardTodoRecord[]
}

export default function ListOfTodo({ todos = defaultTodos }: ListOfTodoProps) {
  return (
    <div className="mx-2 rounded-sm bg-white dark:bg-inherit">
      {todos.map((todo, index) => (
        <div className=" grid grid-cols-5  rounded-sm  p-3 align-middle font-normal " key={`${todo.title}-${index}`}>
          {Object.keys(todo).map((key, keyIndex) => {
            if (key === "status") {
              return (
                <div key={`${todo.title}-${key}-${keyIndex}`} className="flex items-center">
                  <div>
                    <span
                      className={cn(
                        "  rounded-full border-[.5px] px-2 py-1 text-sm capitalize  shadow dark:bg-zinc-800",
                        {
                          "border-green-500 bg-green-200 text-green-700 dark:text-green-400":
                            todo.status === "completed",
                        },
                      )}
                    >
                      {todo.status}
                    </span>
                  </div>
                </div>
              )
            }

            const value = todo[key as keyof DashboardTodoRecord]

            return (
              <h1 className="flex items-center text-lg dark:text-white" key={`${todo.title}-${key}-${keyIndex}`}>
                {value}
              </h1>
            )
          })}

          <div className="flex items-center gap-2">
            <Button variant="outline" className="bg-dark dark:bg-inherit">
              <TrashIcon />
              delete
            </Button>
            <EditTodo />
          </div>
        </div>
      ))}
    </div>
  )
}
