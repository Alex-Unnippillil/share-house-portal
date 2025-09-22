"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  generateChoreAssignments,
  type GenerateChoreAssignmentsResult,
} from "@/src/app/(tenant)/chores/actions"

interface GenerateAssignmentsButtonProps {
  householdId: string | null
  occurrences?: number
}

type StatusState =
  | { state: "idle" }
  | { state: "success"; result: GenerateChoreAssignmentsResult }
  | { state: "error"; message: string }

export function GenerateAssignmentsButton({
  householdId,
  occurrences = 1,
}: GenerateAssignmentsButtonProps) {
  const [status, setStatus] = useState<StatusState>({ state: "idle" })
  const [pending, startTransition] = useTransition()

  const handleClick = () => {
    if (!householdId) {
      setStatus({ state: "error", message: "This admin account is not linked to a household." })
      return
    }

    startTransition(async () => {
      try {
        const result = await generateChoreAssignments({
          householdId,
          occurrences,
        })

        setStatus({ state: "success", result })
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "We couldn't generate new chore assignments. Please try again."
        setStatus({ state: "error", message })
      }
    })
  }

  const disabled = pending || !householdId

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Generate assignments</h2>
          <p className="text-sm text-muted-foreground">
            Cycle through the active member roster and schedule the next set of chore assignments.
          </p>
        </div>
        <Button onClick={handleClick} disabled={disabled}>
          {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Generate
        </Button>
      </div>

      {status.state === "success" && (
        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
          <p>{status.result.message}</p>
          {status.result.skipped.length > 0 && (
            <p>
              Skipped {status.result.skipped.length} entr
              {status.result.skipped.length === 1 ? "y" : "ies"} because they already exist.
            </p>
          )}
          {status.result.assignments.length > 0 && (
            <ul className="space-y-1 text-xs">
              {status.result.assignments.map((assignment) => (
                <li key={`${assignment.choreId}:${assignment.assignedFor}`}>
                  <span className="font-medium">{assignment.choreId}</span> → {new Date(assignment.assignedFor).toLocaleString()}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {status.state === "error" && (
        <p className="mt-3 text-sm text-destructive">{status.message}</p>
      )}

      {!householdId && (
        <p className="mt-3 text-sm text-muted-foreground">
          Link this admin to a household or unit to enable automatic chore scheduling.
        </p>
      )}
    </div>
  )
}
