import React from "react"

import { isFeatureEnabled } from "@/lib/feature-flags"

import CreateForm from "./components/CreateForm"
import SearchTodo from "./components/SearchTodo"
import TodoTable from "./components/TodoTable"
import { TodoListSkeleton } from "./components/skeletons"

export default function Todo() {
  const streamingEnabled = isFeatureEnabled("streamingDashboards")

  return (
    <div className="w-full space-y-5 overflow-y-auto px-3">
      <h1 className="text-3xl font-bold">Todo board</h1>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <SearchTodo />
          {streamingEnabled ? <TodoTable /> : <LegacyTodoList />}
        </div>
        <div className="rounded-lg border border-border/60 bg-card p-4">
          <CreateForm />
        </div>
      </div>
      {streamingEnabled ? null : <TodoListSkeleton />}
    </div>
  )
}

function LegacyTodoList() {
  return <TodoTable />
}
