"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { DASHBOARD_UNDO_WINDOW_MS } from "@/app/dashboard/constants"
import { UndoQueue } from "@/lib/undo-queue"
import { cn } from "@/lib/utils"
import { TrashIcon } from "@radix-ui/react-icons"

import { deleteTodo, restoreTodo } from "../actions"
import type { DashboardTodo } from "../data"

export type TodoListProps = {
  todos: DashboardTodo[]
}

type OptimisticAction =
  | { type: "remove"; todo: DashboardTodo }
  | { type: "restore"; todo: DashboardTodo }

type PendingSet = Set<string>

function reduceTodos(
  state: DashboardTodo[],
  action: OptimisticAction
): DashboardTodo[] {
  switch (action.type) {
    case "remove":
      return state.filter((todo) => todo.id !== action.todo.id)
    case "restore": {
      const without = state.filter((todo) => todo.id !== action.todo.id)
      return [action.todo, ...without]
    }
    default:
      return state
  }
}

export function TodoList({ todos }: TodoListProps) {
  const { toast, dismiss } = useToast()
  const [pending, setPending] = useState<PendingSet>(() => new Set())
  const [optimisticTodos, applyOptimisticTodos] = useOptimistic(
    todos,
    reduceTodos
  )
  const [, startTransition] = useTransition()
  const queueRef = useRef<UndoQueue<DashboardTodo> | null>(null)

  if (!queueRef.current) {
    queueRef.current = new UndoQueue(DASHBOARD_UNDO_WINDOW_MS)
  }

  useEffect(() => {
    return () => queueRef.current?.dispose()
  }, [])

  const setPendingFor = useCallback((id: string, value: boolean) => {
    setPending((previous) => {
      const next = new Set(previous)
      if (value) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }, [])

  const handleUndo = useCallback(
    (todoId: string, toastId?: string) => {
      const queue = queueRef.current
      if (!queue) {
        return
      }
      const restored = queue.undo(todoId)
      if (!restored) {
        toast({
          variant: "destructive",
          title: "Undo no longer available",
          description: "The deletion has already been finalized.",
        })
        return
      }

      applyOptimisticTodos({ type: "restore", todo: restored })
      if (toastId) {
        dismiss(toastId)
      }

      startTransition(async () => {
        try {
          await restoreTodo(restored)
        } catch (error) {
          applyOptimisticTodos({ type: "remove", todo: restored })
          toast({
            variant: "destructive",
            title: "Failed to restore todo",
            description:
              error instanceof Error
                ? error.message
                : "An unexpected error occurred while restoring the todo.",
          })
        }
      })
    },
    [applyOptimisticTodos, dismiss, startTransition, toast]
  )

  const handleDelete = useCallback(
    (todo: DashboardTodo) => {
      const queue = queueRef.current
      if (!queue) {
        return
      }

      setPendingFor(todo.id, true)
      applyOptimisticTodos({ type: "remove", todo })

      startTransition(async () => {
        try {
          const deleted = await deleteTodo(todo.id)
          queue.enqueue(deleted)

          let toastId: string | undefined
          const undoToast = toast({
            title: `Task \"${deleted.title}\" removed`,
            description: "Undo within 30 seconds to restore this task.",
            duration: DASHBOARD_UNDO_WINDOW_MS,
            action: (
              <Button
                variant="outline"
                onClick={() => handleUndo(deleted.id, toastId)}
              >
                Undo
              </Button>
            ),
          })
          toastId = undoToast.id
        } catch (error) {
          applyOptimisticTodos({ type: "restore", todo })
          toast({
            variant: "destructive",
            title: "Failed to delete todo",
            description:
              error instanceof Error
                ? error.message
                : "An unexpected error occurred while deleting the todo.",
          })
        } finally {
          setPendingFor(todo.id, false)
        }
      })
    },
    [applyOptimisticTodos, handleUndo, setPendingFor, startTransition, toast]
  )

  const content = useMemo(
    () =>
      optimisticTodos.map((todo) => {
        const pendingDeletion = pending.has(todo.id)
        const createdAt = new Date(todo.createdAt).toLocaleString()

        return (
          <div key={todo.id} className="flex items-center justify-between gap-4">
            <div className="flex flex-1 flex-col">
              <h1 className={cn({ "line-through": todo.completed })}>{todo.title}</h1>
              <p className="text-xs text-muted-foreground">
                Created {createdAt} by {todo.createdBy}
              </p>
            </div>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => handleDelete(todo)}
              disabled={pendingDeletion}
            >
              <TrashIcon />
              Delete
            </Button>
          </div>
        )
      }),
    [handleDelete, optimisticTodos, pending]
  )

  return <div className="space-y-4">{content}</div>
}
