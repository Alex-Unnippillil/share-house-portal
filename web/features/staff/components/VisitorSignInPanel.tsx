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
import type { VisitorRecord, VisitorStatus } from "@/types/staff"

import { nowIsoString } from "../utils"
import { useStaffOperations } from "../staff-operations-context"

const visitorSchema = z.object({
  badgeNumber: z.string().min(1, "Badge number required"),
  company: z.string().min(1, "Company required"),
  contactNumber: z.string().optional(),
  host: z.string().min(1, "Host required"),
  name: z.string().min(2, "Visitor name required"),
  notes: z.string().optional(),
  purpose: z.string().min(2, "Purpose required"),
})

type VisitorFormValues = z.infer<typeof visitorSchema>

const visitorStatusTone: Record<VisitorStatus, string> = {
  checked_in: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-200",
  checked_out: "bg-slate-500/20 text-slate-700 dark:text-slate-200",
  expected: "bg-amber-500/20 text-amber-700 dark:text-amber-200",
}

const visitorStatusLabel: Record<VisitorStatus, string> = {
  checked_in: "On Site",
  checked_out: "Checked Out",
  expected: "Expected",
}

export const VisitorSignInPanel = () => {
  const { addVisitor, state, updateVisitorStatus } = useStaffOperations()

  const form = useForm<VisitorFormValues>({
    defaultValues: {
      badgeNumber: "",
      company: "",
      contactNumber: "",
      host: "",
      name: "",
      notes: "",
      purpose: "Meeting",
    },
    resolver: zodResolver(visitorSchema),
  })

  const visitors = useMemo(() => state.visitors.slice(0, 10), [state.visitors])
  const activeVisitors = visitors.filter((visitor) => visitor.status === "checked_in")

  const handleSubmit = (values: VisitorFormValues) => {
    const visitor: VisitorRecord = {
      id: `${values.badgeNumber}-${Date.now()}`,
      status: "checked_in",
      checkIn: nowIsoString(),
      ...values,
    }
    addVisitor(visitor)
    form.reset({ ...values, badgeNumber: "", company: "", host: "", name: "", notes: "" })
  }

  const handleCheckOut = (id: string) => {
    updateVisitorStatus(id, "checked_out")
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl">Visitor Sign-In</CardTitle>
        <p className="text-sm text-muted-foreground">
          Capture arrivals in real time and keep track of active badges. Designed
          for lobby tablets with spacious form controls.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visitor Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Full name" {...field} className="text-base" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <FormControl>
                    <Input placeholder="Organization" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="host"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Host</FormLabel>
                  <FormControl>
                    <Input placeholder="Resident or team member" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purpose</FormLabel>
                  <FormControl>
                    <Input placeholder="Meeting, delivery, interview" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="badgeNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Badge</FormLabel>
                  <FormControl>
                    <Input placeholder="Badge ID" {...field} className="uppercase" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Special instructions or follow-up"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="md:col-span-2 flex flex-col gap-3 md:flex-row md:items-center">
              <Button type="submit" className="md:w-48">
                Sign In Visitor
              </Button>
              <div className="flex flex-1 flex-wrap gap-3 text-sm text-muted-foreground">
                <span>{activeVisitors.length} on site</span>
                <span>Badges ready: {visitors.length}</span>
                <span>Checklist sync via realtime channel</span>
              </div>
            </div>
          </form>
        </Form>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Visitor Ledger</h3>
            <span className="text-sm text-muted-foreground">Latest 10 entries</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visitors.map((visitor) => (
              <div key={visitor.id} className="rounded-lg border p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{visitor.name}</p>
                    <p className="text-xs text-muted-foreground">{visitor.company}</p>
                  </div>
                  <Badge className={visitorStatusTone[visitor.status]}>
                    {visitorStatusLabel[visitor.status]}
                  </Badge>
                </div>
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Host</dt>
                    <dd>{visitor.host}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Badge</dt>
                    <dd>{visitor.badgeNumber}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Check-In</dt>
                    <dd>{new Date(visitor.checkIn).toLocaleTimeString()}</dd>
                  </div>
                  {visitor.checkOut ? (
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Check-Out</dt>
                      <dd>{new Date(visitor.checkOut).toLocaleTimeString()}</dd>
                    </div>
                  ) : null}
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={visitor.status !== "checked_in"}
                    className="md:w-32"
                    onClick={() => handleCheckOut(visitor.id)}
                  >
                    Complete Visit
                  </Button>
                </div>
                {visitor.notes ? (
                  <p className="mt-3 rounded-md bg-muted p-2 text-xs text-muted-foreground">
                    {visitor.notes}
                  </p>
                ) : null}
              </div>
            ))}
            {visitors.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No visitors signed in. Complete the tablet workflow above to verify
                the checklist.
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
