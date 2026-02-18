import { TodoListSkeleton } from "./components/skeletons"

export default function LoadingTodo() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="w-96 space-y-5">
        <div className="h-10 w-32 animate-pulse rounded bg-muted/60" />
        <TodoListSkeleton />
      </div>
    </div>
  )
}
