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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { IncidentReport, IncidentSeverity } from "@/types/staff"

import { nowIsoString } from "../utils"
import { useStaffOperations } from "../staff-operations-context"

const incidentSchema = z.object({
  actionsTaken: z.string().min(2, "Actions required"),
  description: z.string().min(10, "Incident description required"),
  location: z.string().min(2, "Location required"),
  occurredAt: z.string().min(1, "Date/time required"),
  reportedBy: z.string().min(2, "Reporter name required"),
  severity: z.enum(["minor", "major", "critical"]),
  title: z.string().min(4, "Title required"),
  witnesses: z.string().optional(),
})

type IncidentFormValues = z.infer<typeof incidentSchema>

const severityTone: Record<IncidentSeverity, string> = {
  critical: "bg-red-600/20 text-red-700 dark:text-red-200",
  major: "bg-amber-500/20 text-amber-700 dark:text-amber-200",
  minor: "bg-slate-500/20 text-slate-700 dark:text-slate-200",
}

export const IncidentReportForm = () => {
  const { addIncident, state } = useStaffOperations()

  const form = useForm<IncidentFormValues>({
    defaultValues: {
      actionsTaken: "",
      description: "",
      location: "",
      occurredAt: nowIsoString().slice(0, 16),
      reportedBy: "",
      severity: "minor",
      title: "",
      witnesses: "",
    },
    resolver: zodResolver(incidentSchema),
  })

  const incidents = useMemo(() => state.incidents.slice(0, 6), [state.incidents])

  const handleSubmit = (values: IncidentFormValues) => {
    const incident: IncidentReport = {
      id: `incident-${Date.now()}`,
      attachments: [],
      occurredAt: values.occurredAt,
      ...values,
    }
    addIncident(incident)
    form.reset({ ...values, actionsTaken: "", description: "", title: "", witnesses: "" })
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl">Incident Reporting</CardTitle>
        <p className="text-sm text-muted-foreground">
          Capture critical events with mandatory follow-up information. All
          submissions feed the operations audit trail automatically.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 md:grid-cols-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="md:col-span-3">
                  <FormLabel>Incident Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Short headline" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="severity"
              render={({ field }) => (
                <FormItem className="md:col-span-1">
                  <FormLabel>Severity</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Severity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent align="start">
                      <SelectItem value="minor">Minor</SelectItem>
                      <SelectItem value="major">Major</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="occurredAt"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Occurred</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Lobby, unit, parking" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reportedBy"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Reported By</FormLabel>
                  <FormControl>
                    <Input placeholder="Staff name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="witnesses"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Witnesses</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-6">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Chronological account of what happened"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="actionsTaken"
              render={({ field }) => (
                <FormItem className="md:col-span-6">
                  <FormLabel>Immediate Actions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Who was notified and what steps were taken"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="md:col-span-6 flex flex-col gap-3 md:flex-row md:items-center">
              <Button type="submit" className="md:w-48">
                Submit Incident
              </Button>
              <p className="text-sm text-muted-foreground">
                Critical incidents trigger additional alerts via the shared realtime
                channel.
              </p>
            </div>
          </form>
        </Form>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent Reports</h3>
            <span className="text-sm text-muted-foreground">Latest 6</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {incidents.map((incident) => (
              <article key={incident.id} className="rounded-lg border p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold leading-tight">{incident.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {new Date(incident.occurredAt).toLocaleString()} · {incident.location}
                    </p>
                  </div>
                  <Badge className={severityTone[incident.severity]}>{incident.severity}</Badge>
                </div>
                <p className="mt-3 text-sm">{incident.description}</p>
                <p className="mt-2 rounded-md bg-muted/60 p-2 text-xs text-muted-foreground">
                  Actions: {incident.actionsTaken}
                </p>
                {incident.witnesses ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Witnesses: {incident.witnesses}
                  </p>
                ) : null}
              </article>
            ))}
            {incidents.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No incidents logged yet. Submit the form above to test the reporting
                workflow.
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
