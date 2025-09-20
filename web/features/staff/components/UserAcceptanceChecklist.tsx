"use client"

import { useMemo } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { ChecklistState } from "@/types/staff"

import { useStaffOperations } from "../staff-operations-context"

const checklistConfig: { key: keyof ChecklistState; label: string; description: string }[] = [
  {
    description: "Add a new package and advance it to another status.",
    key: "packageIntake",
    label: "Package intake flow",
  },
  {
    description: "Sign in a visitor and confirm they appear in the ledger.",
    key: "visitorSignIn",
    label: "Visitor sign-in flow",
  },
  {
    description: "Create a work order and move it across at least one column.",
    key: "workOrderUpdated",
    label: "Work order board",
  },
  {
    description: "Log a shift note to confirm the timeline updates.",
    key: "shiftLogUpdated",
    label: "Shift timeline",
  },
  {
    description: "Submit an incident report with required details.",
    key: "incidentLogged",
    label: "Incident reporting",
  },
  {
    description: "Start and end a shift session to capture time tracking.",
    key: "timeTracked",
    label: "Time tracking",
  },
]

export const UserAcceptanceChecklist = () => {
  const { state } = useStaffOperations()

  const completedCount = useMemo(() => {
    return checklistConfig.filter((item) => state.checklist[item.key]).length
  }, [state.checklist])

  const progress = Math.round((completedCount / checklistConfig.length) * 100)

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl">User Acceptance Checklist</CardTitle>
        <p className="text-sm text-muted-foreground">
          Confirm each core workflow has been exercised. Progress updates as flows
          are completed, ensuring a reliable demo script.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Progress</span>
            <Badge variant={progress === 100 ? "default" : "secondary"}>{progress}%</Badge>
          </div>
          <Progress value={progress} className="h-3" />
        </div>
        <div className="space-y-3">
          {checklistConfig.map((item) => (
            <div
              key={item.key}
              className="flex items-start justify-between gap-3 rounded-lg border p-4"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium leading-tight">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <Badge variant={state.checklist[item.key] ? "default" : "outline"}>
                {state.checklist[item.key] ? "Complete" : "Pending"}
              </Badge>
            </div>
          ))}
        </div>
        <div className="mt-auto space-y-2 rounded-md bg-muted/60 p-4 text-sm text-muted-foreground">
          <p>
            Tip: broadcast updates propagate through WebSockets when configured via
            <code className="mx-1 rounded bg-background px-1 py-0.5 text-xs">NEXT_PUBLIC_STAFF_SOCKET_URL</code>
            and fall back to shared storage polling.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.print()
              }
            }}
          >
            Export Checklist
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
