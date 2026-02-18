import React, { Suspense } from "react"

import { isFeatureEnabled } from "@/lib/feature-flags"
import { Button } from "@/components/ui/button"

import CreateForm from "./components/CreateForm"
import { TodoItems } from "./components/TodoItems"
import { TodoListSkeleton } from "./components/skeletons"

export default function Todo() {
  const streamingEnabled = isFeatureEnabled("streamingDashboards")

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="w-96 space-y-5">
        <CreateForm />
        {streamingEnabled ? (
          <Suspense fallback={<TodoListSkeleton />}>
            <TodoItems />
          </Suspense>
        ) : (
          <LegacyTodoList />
        )}
      </div>
    </div>
  )
}

function LegacyTodoList() {
  const todos = [
    {
      title: "Subscribe",
      created_by: "091832901830",
      id: "101981908",
      completed: false,
    },
  ]

  return (
    <div className="space-y-4">
      {todos.map((todo, index) => (
        <div key={index} className="flex items-center gap-6">
          <h1 className={todo.completed ? "line-through" : undefined}>
            {todo.title}
          </h1>
          <Button>delete</Button>
          <Button>Update</Button>
        </div>
      ))}
    </div>
  )
}
