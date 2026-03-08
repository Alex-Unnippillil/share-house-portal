"use client"

import * as React from "react"
import { useFormState, useFormStatus } from "react-dom"

import { rollAssignments, rollAssignmentsInitialState } from "@/app/chores/actions"
import type { RollAssignmentsState } from "@/app/chores/actions"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface RollAssignmentsButtonProps {
  className?: string
  children?: React.ReactNode
}

function SubmitButton({ children }: { children?: React.ReactNode }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" isLoading={pending} disabled={pending}>
      {children ?? "Roll assignments"}
    </Button>
  )
}

export function RollAssignmentsButton({
  className,
  children,
}: RollAssignmentsButtonProps) {
  const [state, action] = useFormState<RollAssignmentsState, FormData>(
    rollAssignments,
    rollAssignmentsInitialState
  )

  React.useEffect(() => {
    if (state.status === "idle") {
      return
    }

    if (state.status === "success") {
      const description =
        state.message ??
        (state.summary
          ? `${state.summary.assignmentsCreated} assignment${state.summary.assignmentsCreated === 1 ? "" : "s"} generated for the week starting ${state.summary.weekStart}.`
          : undefined)

      toast({
        title: "Assignments rolled",
        description,
      })
    }

    if (state.status === "error") {
      toast({
        title: state.message ?? "Unable to roll assignments",
        description: state.details,
        variant: "destructive",
      })
    }
  }, [state])

  return (
    <form action={action} className={cn("inline-flex", className)}>
      <SubmitButton>{children}</SubmitButton>
    </form>
  )
}

