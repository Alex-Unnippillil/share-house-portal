import { Skeleton } from "@/components/ui/skeleton"

import { TodoListSkeleton } from "./components/skeletons"

export default function LoadingTodo() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="w-96 space-y-5">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <TodoListSkeleton />
      </div>
    </div>
  )
}
