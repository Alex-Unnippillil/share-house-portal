import React from 'react'

import CreateForm from './components/CreateForm'
import TodoTable from './components/TodoTable'

export default function Todo() {
  return (
    <div className="space-y-6 px-4 py-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Admin task queue</h1>
        <p className="text-sm text-muted-foreground">
          Review, sort, and filter high volume maintenance and operations requests without losing context.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <div className="rounded-md border border-border bg-background p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Create new task</h2>
          <CreateForm />
        </div>
        <TodoTable />
      </div>
    </div>
  )
}
