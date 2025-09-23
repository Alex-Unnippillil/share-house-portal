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

import { deleteMember, restoreMember } from "../actions"
import type { DashboardMember } from "../data"
import EditMember from "./edit/EditMember"

type OptimisticAction =
  | { type: "remove"; member: DashboardMember }
  | { type: "restore"; member: DashboardMember }

type PendingMap = Set<string>

function reduceMembers(
  state: DashboardMember[],
  action: OptimisticAction
): DashboardMember[] {
  switch (action.type) {
    case "remove":
      return state.filter((member) => member.id !== action.member.id)
    case "restore": {
      const without = state.filter((member) => member.id !== action.member.id)
      return [action.member, ...without]
    }
    default:
      return state
  }
}

export default function ListOfMembers({
  members,
}: {
  members: DashboardMember[]
}) {
  const { toast, dismiss } = useToast()
  const [pendingIds, setPendingIds] = useState<PendingMap>(() => new Set())
  const [optimisticMembers, applyOptimisticMembers] = useOptimistic(
    members,
    reduceMembers
  )
  const [, startTransition] = useTransition()
  const queueRef = useRef<UndoQueue<DashboardMember> | null>(null)

  if (!queueRef.current) {
    queueRef.current = new UndoQueue(DASHBOARD_UNDO_WINDOW_MS)
  }

  useEffect(() => {
    return () => queueRef.current?.dispose()
  }, [])

  const setPendingFor = useCallback((id: string, value: boolean) => {
    setPendingIds((previous) => {
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
    (memberId: string, toastId?: string) => {
      const queue = queueRef.current
      if (!queue) {
        return
      }
      const restored = queue.undo(memberId)
      if (!restored) {
        toast({
          variant: "destructive",
          title: "Undo no longer available",
          description: "The 30 second undo window has already expired.",
        })
        return
      }

      applyOptimisticMembers({ type: "restore", member: restored })
      if (toastId) {
        dismiss(toastId)
      }

      startTransition(async () => {
        try {
          await restoreMember(restored)
        } catch (error) {
          applyOptimisticMembers({ type: "remove", member: restored })
          toast({
            variant: "destructive",
            title: "Failed to restore member",
            description:
              error instanceof Error
                ? error.message
                : "An unexpected error occurred while restoring the member.",
          })
        }
      })
    },
    [applyOptimisticMembers, dismiss, startTransition, toast]
  )

  const handleDelete = useCallback(
    (member: DashboardMember) => {
      const queue = queueRef.current
      if (!queue) {
        return
      }

      setPendingFor(member.id, true)
      applyOptimisticMembers({ type: "remove", member })

      startTransition(async () => {
        try {
          const deleted = await deleteMember(member.id)
          queue.enqueue(deleted)

          let toastId: string | undefined
          const undoToast = toast({
            title: `${deleted.name} removed`,
            description: "Undo within 30 seconds to restore this member.",
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
          applyOptimisticMembers({ type: "restore", member })
          toast({
            variant: "destructive",
            title: "Failed to delete member",
            description:
              error instanceof Error
                ? error.message
                : "An unexpected error occurred while deleting the member.",
          })
        } finally {
          setPendingFor(member.id, false)
        }
      })
    },
    [applyOptimisticMembers, handleUndo, setPendingFor, startTransition, toast]
  )

  const renderMembers = useMemo(
    () =>
      optimisticMembers.map((member) => {
        const pending = pendingIds.has(member.id)
        const joinedDate = new Date(member.createdAt).toLocaleDateString()

        return (
          <div
            className="grid grid-cols-5 rounded-sm p-3 align-middle font-normal"
            key={member.id}
          >
            <h1>{member.name}</h1>

            <div>
              <span
                className={cn(
                  "rounded-full border-[.5px] px-2 py-1 text-sm capitalize shadow dark:bg-zinc-800",
                  {
                    "border-green-500 bg-green-200 text-green-600":
                      member.role === "admin",
                    "border-zinc-300 bg-yellow-50 px-4 text-yellow-700 dark:border-yellow-700 dark:text-yellow-300":
                      member.role === "user",
                  }
                )}
              >
                {member.role}
              </span>
            </div>
            <h1>{joinedDate}</h1>
            <div>
              <span
                className={cn(
                  "rounded-full border border-zinc-300 px-2 py-1 text-sm capitalize dark:bg-zinc-800",
                  {
                    "bg-green-200 px-4 text-green-600 dark:border-green-400":
                      member.status === "active",
                    "bg-red-100 text-red-500 dark:border-red-400 dark:text-red-300":
                      member.status === "resigned",
                  }
                )}
              >
                {member.status}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => handleDelete(member)}
                disabled={pending}
              >
                <TrashIcon />
                Delete
              </Button>
              <EditMember />
            </div>
          </div>
        )
      }),
    [handleDelete, optimisticMembers, pendingIds]
  )

  return <div className="mx-2 rounded-sm bg-white dark:bg-inherit">{renderMembers}</div>
}
