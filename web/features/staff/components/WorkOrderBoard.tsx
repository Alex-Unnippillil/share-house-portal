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
import type { WorkOrder, WorkOrderStatus } from "@/types/staff"

import { nowIsoString } from "../utils"
import { useStaffOperations } from "../staff-operations-context"

const workOrderSchema = z.object({
  category: z.enum(["maintenance", "cleaning", "security", "other"]),
  details: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  requestedBy: z.string().min(2, "Requester required"),
  title: z.string().min(2, "Title required"),
  unit: z.string().min(1, "Unit required"),
})

type WorkOrderFormValues = z.infer<typeof workOrderSchema>

const statusDefinitions: { key: WorkOrderStatus; label: string; description: string }[] = [
  { key: "new", label: "New", description: "Requests awaiting triage" },
  { key: "in_progress", label: "In Progress", description: "Active assignments" },
  { key: "completed", label: "Completed", description: "Ready to close" },
]

const priorityColor: Record<WorkOrder["priority"], string> = {
  high: "bg-red-500/20 text-red-700 dark:text-red-200",
  low: "bg-slate-500/20 text-slate-700 dark:text-slate-200",
  medium: "bg-amber-500/20 text-amber-700 dark:text-amber-200",
}

export const WorkOrderBoard = () => {
  const { addWorkOrder, moveWorkOrder, state } = useStaffOperations()

  const form = useForm<WorkOrderFormValues>({
    defaultValues: {
      category: "maintenance",
      details: "",
      priority: "medium",
      requestedBy: "",
      title: "",
      unit: "",
    },
    resolver: zodResolver(workOrderSchema),
  })

  const workOrders = useMemo(() => state.workOrders, [state.workOrders])

  const handleSubmit = (values: WorkOrderFormValues) => {
    const workOrder: WorkOrder = {
      id: `wo-${Date.now()}`,
      status: "new",
      updatedAt: nowIsoString(),
      ...values,
    }
    addWorkOrder(workOrder)
    form.reset({ ...values, details: "", requestedBy: "", title: "", unit: "" })
  }

  const handleDrop = (status: WorkOrderStatus, event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const identifier = event.dataTransfer.getData("application/work-order")
    if (!identifier) {
      return
    }
    moveWorkOrder(identifier, status)
  }

  const handleDragStart = (id: string, event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData("application/work-order", id)
    event.dataTransfer.effectAllowed = "move"
  }

  const cycleStatus = (order: WorkOrder) => {
    const flow: WorkOrderStatus[] = ["new", "in_progress", "completed"]
    const currentIndex = flow.indexOf(order.status)
    const nextStatus = flow[Math.min(currentIndex + 1, flow.length - 1)]
    if (nextStatus !== order.status) {
      moveWorkOrder(order.id, nextStatus)
    }
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl">Work Order Board</CardTitle>
        <p className="text-sm text-muted-foreground">
          Drag-and-drop requests between queues or tap the quick action button on
          touch devices. Updates broadcast immediately across consoles.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-6">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="grid gap-4 md:grid-cols-6"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Short summary" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit</FormLabel>
                  <FormControl>
                    <Input placeholder="Apt 3B" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="requestedBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requested By</FormLabel>
                  <FormControl>
                    <Input placeholder="Resident" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent align="start">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent align="start">
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="cleaning">Cleaning</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem className="md:col-span-6">
                  <FormLabel>Details</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Steps taken, vendor contact, or escalation notes"
                      className="min-h-[70px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="md:col-span-6 flex flex-col gap-3 md:flex-row md:items-center">
              <Button type="submit" className="md:w-44">
                Add Request
              </Button>
              <p className="text-sm text-muted-foreground">
                Drag cards to reprioritize or tap “Advance Stage” to move them on
                touch-only devices.
              </p>
            </div>
          </form>
        </Form>
        <div className="grid gap-4 lg:grid-cols-3">
          {statusDefinitions.map((status) => (
            <section
              key={status.key}
              className="flex flex-1 flex-col rounded-lg border bg-card"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(status.key, event)}
            >
              <header className="flex items-center justify-between rounded-t-lg bg-muted/60 p-4">
                <div>
                  <h3 className="font-semibold">{status.label}</h3>
                  <p className="text-xs text-muted-foreground">{status.description}</p>
                </div>
                <Badge variant="secondary">{workOrders[status.key].length}</Badge>
              </header>
              <div className="flex flex-1 flex-col gap-3 p-4">
                {workOrders[status.key].map((order) => (
                  <article
                    key={order.id}
                    draggable
                    onDragStart={(event) => handleDragStart(order.id, event)}
                    className="touch-manipulation rounded-lg border bg-background p-4 shadow-sm transition hover:border-primary focus-within:ring-2 focus-within:ring-primary"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold">{order.title}</h4>
                        <p className="text-xs text-muted-foreground">{order.unit}</p>
                      </div>
                      <Badge className={priorityColor[order.priority]}>{order.priority}</Badge>
                    </div>
                    <dl className="mt-3 space-y-1 text-xs md:text-sm">
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Requested by</dt>
                        <dd>{order.requestedBy}</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Category</dt>
                        <dd className="capitalize">{order.category}</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Updated</dt>
                        <dd>{new Date(order.updatedAt).toLocaleString()}</dd>
                      </div>
                    </dl>
                    {order.details ? (
                      <p className="mt-2 rounded-md bg-muted/60 p-2 text-xs text-muted-foreground">
                        {order.details}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1"
                        variant="secondary"
                        onClick={() => cycleStatus(order)}
                      >
                        Advance Stage
                      </Button>
                    </div>
                  </article>
                ))}
                {workOrders[status.key].length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
                    Drop items here or use the form above to seed this lane.
                  </div>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
