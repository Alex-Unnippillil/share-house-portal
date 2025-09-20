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
import type { ShiftLogEntry } from "@/types/staff"

import { nowIsoString } from "../utils"
import { useStaffOperations } from "../staff-operations-context"

const shiftSchema = z.object({
  author: z.string().min(2, "Name required"),
  followUp: z.string().optional(),
  role: z.string().min(2, "Role required"),
  summary: z.string().min(4, "Summary required"),
  type: z.enum(["handover", "note", "alert"]),
})

type ShiftFormValues = z.infer<typeof shiftSchema>

const typeCopy: Record<ShiftLogEntry["type"], { label: string; tone: string }> = {
  alert: { label: "Alert", tone: "bg-red-500/20 text-red-700 dark:text-red-200" },
  handover: { label: "Handover", tone: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-200" },
  note: { label: "Note", tone: "bg-slate-500/20 text-slate-700 dark:text-slate-200" },
}

export const ShiftLogTimeline = () => {
  const { addShiftEntry, state } = useStaffOperations()

  const form = useForm<ShiftFormValues>({
    defaultValues: {
      author: "",
      followUp: "",
      role: "",
      summary: "",
      type: "handover",
    },
    resolver: zodResolver(shiftSchema),
  })

  const timeline = useMemo(() => state.shiftLog.slice(0, 12), [state.shiftLog])

  const handleSubmit = (values: ShiftFormValues) => {
    const entry: ShiftLogEntry = {
      id: `shift-${Date.now()}`,
      timestamp: nowIsoString(),
      ...values,
    }
    addShiftEntry(entry)
    form.reset({ ...values, summary: "", followUp: "" })
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl">Shift Log Timeline</CardTitle>
        <p className="text-sm text-muted-foreground">
          Maintain a chronological record of every handoff, alert, and important
          note. Entries automatically roll into the incident checklist.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 md:grid-cols-5">
            <FormField
              control={form.control}
              name="author"
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
                    <Input placeholder="Front desk, security" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entry Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="handover">Handover</SelectItem>
                      <SelectItem value="note">Note</SelectItem>
                      <SelectItem value="alert">Alert</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem className="md:col-span-5">
                  <FormLabel>Summary</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Key details shared at shift change"
                      className="min-h-[70px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="followUp"
              render={({ field }) => (
                <FormItem className="md:col-span-5">
                  <FormLabel>Follow Up Tasks</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Outstanding actions or watch-outs"
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="md:col-span-5 flex flex-col gap-3 md:flex-row md:items-center">
              <Button type="submit" className="md:w-44">
                Log Entry
              </Button>
              <p className="text-sm text-muted-foreground">
                Timeline is instantly synced across active shifts with our
                BroadcastChannel/WebSocket bridge.
              </p>
            </div>
          </form>
        </Form>
        <ol className="relative space-y-4 border-s border-dashed px-4 py-2 md:px-8">
          {timeline.map((entry) => (
            <li key={entry.id} className="space-y-2 ps-6">
              <span className="absolute -ms-1 mt-2 h-2 w-2 rounded-full bg-primary" aria-hidden />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium leading-tight">
                    {entry.author} · <span className="text-muted-foreground">{entry.role}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </div>
                <Badge className={typeCopy[entry.type].tone}>{typeCopy[entry.type].label}</Badge>
              </div>
              <p className="rounded-md bg-muted/60 p-3 text-sm">{entry.summary}</p>
              {entry.followUp ? (
                <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  Follow up: {entry.followUp}
                </p>
              ) : null}
            </li>
          ))}
          {timeline.length === 0 ? (
            <li className="ps-6 text-sm text-muted-foreground">No shift notes logged yet.</li>
          ) : null}
        </ol>
      </CardContent>
    </Card>
  )
}
