"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { TimeSession } from "@/types/staff"

import { nowIsoString } from "../utils"
import { useStaffOperations } from "../staff-operations-context"

const startShiftSchema = z.object({
  notes: z.string().optional(),
  role: z.string().min(2, "Role required"),
  staffName: z.string().min(2, "Staff name required"),
})

type StartShiftValues = z.infer<typeof startShiftSchema>

export const TimeTrackingPanel = () => {
  const { startSession, state, stopSession, toggleBreak } = useStaffOperations()

  const form = useForm<StartShiftValues>({
    defaultValues: {
      notes: "",
      role: "",
      staffName: "",
    },
    resolver: zodResolver(startShiftSchema),
  })

  const activeSessions = useMemo(() => state.timeTracking.activeSessions, [state.timeTracking.activeSessions])
  const recentSessions = useMemo(() => state.timeTracking.history.slice(0, 5), [state.timeTracking.history])

  const handleStartShift = (values: StartShiftValues) => {
    const session: TimeSession = {
      id: `shift-${values.staffName}-${Date.now()}`,
      breaks: [],
      notes: values.notes,
      role: values.role,
      staffName: values.staffName,
      startedAt: nowIsoString(),
    }
    startSession(session)
    form.reset({ ...values, notes: "" })
  }

  const handleEndShift = (session: TimeSession) => {
    stopSession({ id: session.id, endedAt: nowIsoString(), notes: session.notes })
  }

  const handleBreakToggle = (session: TimeSession) => {
    toggleBreak({ id: session.id, timestamp: nowIsoString() })
  }

  const isOnBreak = (session: TimeSession) => session.breaks.some((entry) => !entry.endedAt)

  const formatBreakSummary = (session: TimeSession) => {
    if (session.breaks.length === 0) {
      return "None"
    }
    const labels = session.breaks
      .map((breakEntry) => {
        if (!breakEntry.endedAt) {
          return "Active"
        }
        const minutes = Math.round(
          (new Date(breakEntry.endedAt).getTime() - new Date(breakEntry.startedAt).getTime()) /
            60000,
        )
        return `${minutes}m`
      })
      .join(", ")
    return `${session.breaks.length} (${labels})`
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl">Time Tracking</CardTitle>
        <p className="text-sm text-muted-foreground">
          Manage shift clocks and breaks directly from a shared device. All events
          sync instantly with other connected tablets.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleStartShift)} className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="staffName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Member</FormLabel>
                  <FormControl>
                    <Input placeholder="Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Input placeholder="Front desk, maintenance" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="md:col-span-3">
                  <FormLabel>Shift Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional context or tasks"
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="md:col-span-3 flex flex-col gap-3 md:flex-row md:items-center">
              <Button type="submit" className="md:w-48">
                Start Shift
              </Button>
              <p className="text-sm text-muted-foreground">
                Shifts are tracked locally with BroadcastChannel sync fallback.
              </p>
            </div>
          </form>
        </Form>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-3">
            <header className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Active Sessions</h3>
              <Badge variant="secondary">{activeSessions.length}</Badge>
            </header>
            <div className="space-y-3">
              {activeSessions.map((session) => (
                <article key={session.id} className="rounded-lg border p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="font-semibold leading-tight">{session.staffName}</h4>
                      <p className="text-xs text-muted-foreground">{session.role}</p>
                    </div>
                    <Badge>{isOnBreak(session) ? "On Break" : "Clocked In"}</Badge>
                  </div>
                  <dl className="mt-3 space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Started</dt>
                      <dd>{new Date(session.startedAt).toLocaleTimeString()}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Breaks</dt>
                      <dd>{formatBreakSummary(session)}</dd>
                    </div>
                  </dl>
                  {session.notes ? (
                    <p className="mt-3 rounded-md bg-muted/60 p-2 text-xs text-muted-foreground">
                      {session.notes}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleBreakToggle(session)}
                    >
                      {isOnBreak(session) ? "Resume" : "Break"}
                    </Button>
                    <Button type="button" size="sm" onClick={() => handleEndShift(session)}>
                      End Shift
                    </Button>
                  </div>
                </article>
              ))}
              {activeSessions.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Nobody is clocked in. Use the form above to start a session.
                </div>
              ) : null}
            </div>
          </section>
          <section className="space-y-3">
            <header className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Completed Sessions</h3>
              <Badge variant="secondary">{recentSessions.length}</Badge>
            </header>
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <article key={session.id} className="rounded-lg border p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold leading-tight">{session.staffName}</h4>
                      <p className="text-xs text-muted-foreground">{session.role}</p>
                    </div>
                    <Badge variant="outline">{session.breaks.length} breaks</Badge>
                  </div>
                  <dl className="mt-3 space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Start</dt>
                      <dd>{new Date(session.startedAt).toLocaleString()}</dd>
                    </div>
                    {session.endedAt ? (
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">End</dt>
                        <dd>{new Date(session.endedAt).toLocaleString()}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {session.notes ? (
                    <p className="mt-3 rounded-md bg-muted/60 p-2 text-xs text-muted-foreground">
                      {session.notes}
                    </p>
                  ) : null}
                </article>
              ))}
              {recentSessions.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No completed sessions yet today.
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  )
}
