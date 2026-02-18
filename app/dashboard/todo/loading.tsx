import { TodoListSkeleton } from "./components/skeletons"

export default function LoadingTodo() {
        return (
                <div className="flex min-h-full items-start justify-center py-6 sm:py-10">
                        <div className="w-full max-w-md space-y-5">
                                <div className="h-10 w-32 animate-pulse rounded bg-muted/60" />
                                <TodoListSkeleton />
                        </div>
                </div>
        )
}
