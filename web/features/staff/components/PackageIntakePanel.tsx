"use client"

import { useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import type { PackageRecord, PackageStatus } from "@/types/staff"

import { nowIsoString } from "../utils"
import { useStaffOperations } from "../staff-operations-context"

const packageSchema = z.object({
  carrier: z.string().min(2, "Carrier required"),
  location: z.string().min(2, "Location required"),
  notes: z.string().optional(),
  recipient: z.string().min(2, "Recipient required"),
  trackingNumber: z.string().min(5, "Tracking number required"),
})

type PackageFormValues = z.infer<typeof packageSchema>

const statusLabels: Record<PackageStatus, string> = {
  notified: "Notified",
  picked_up: "Picked Up",
  received: "Received",
}

const statusIntent: Record<PackageStatus, string> = {
  notified: "bg-amber-500/20 text-amber-700 dark:text-amber-200",
  picked_up: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-200",
  received: "bg-slate-500/20 text-slate-700 dark:text-slate-200",
}

export const PackageIntakePanel = () => {
  const { addPackage, state, updatePackageStatus } = useStaffOperations()

  const form = useForm<PackageFormValues>({
    defaultValues: {
      carrier: "",
      location: "Front Desk",
      notes: "",
      recipient: "",
      trackingNumber: "",
    },
    mode: "onBlur",
    resolver: zodResolver(packageSchema),
  })

  const packages = useMemo(() => state.packages.slice(0, 10), [state.packages])

  const handleSubmit = (values: PackageFormValues) => {
    const newPackage: PackageRecord = {
      id: values.trackingNumber,
      receivedAt: nowIsoString(),
      status: "received",
      ...values,
    }
    addPackage(newPackage)
    form.reset()
  }

  const handleSimulatedScan = () => {
    const simulatedCode = `PKG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    form.setValue("trackingNumber", simulatedCode, { shouldValidate: true })
  }

  const handleStatusChange = (id: string, status: PackageStatus) => {
    updatePackageStatus(id, status)
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl">Package Intake</CardTitle>
        <p className="text-sm text-muted-foreground">
          Scan and manage incoming deliveries. Optimized for quick tablet entry
          with large touch targets and inline status updates.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-6">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="grid gap-4 md:grid-cols-2"
          >
            <FormField
              control={form.control}
              name="trackingNumber"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Tracking Number</FormLabel>
                  <div className="flex flex-col gap-3 md:flex-row">
                    <FormControl>
                      <Input
                        placeholder="Scan or enter tracking number"
                        {...field}
                        className="text-base md:text-lg"
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleSimulatedScan}
                      className="md:w-48"
                    >
                      Simulate Scan
                    </Button>
                  </div>
                  <FormDescription>
                    Compatible with keyboard wedge scanners. Use the simulator when
                    testing without hardware.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recipient"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient</FormLabel>
                  <FormControl>
                    <Input placeholder="Resident or team member" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="carrier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Carrier</FormLabel>
                  <FormControl>
                    <Input placeholder="USPS, UPS, FedEx" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Storage Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Package room shelf" {...field} />
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
                      placeholder="Damage, oversized handling, or delivery instructions"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="md:col-span-2 flex flex-col gap-3 md:flex-row md:items-center">
              <Button type="submit" className="md:w-40">
                Add Package
              </Button>
              <p className="text-sm text-muted-foreground">
                Submissions instantly sync with connected tablets through
                BroadcastChannel/WebSocket fallbacks.
              </p>
            </div>
          </form>
        </Form>
        <Separator />
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent Packages</h3>
            <span className="text-sm text-muted-foreground">Showing latest 10</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {packages.map((packageItem) => (
              <div
                key={packageItem.id}
                className="rounded-lg border p-4 shadow-sm transition hover:border-primary md:p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{packageItem.trackingNumber}</p>
                    <p className="text-xs text-muted-foreground">{packageItem.carrier}</p>
                  </div>
                  <Badge className={statusIntent[packageItem.status]}>
                    {statusLabels[packageItem.status]}
                  </Badge>
                </div>
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Recipient</dt>
                    <dd>{packageItem.recipient}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Location</dt>
                    <dd>{packageItem.location}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Received</dt>
                    <dd>{new Date(packageItem.receivedAt).toLocaleString()}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(["received", "notified", "picked_up"] as PackageStatus[]).map((status) => (
                    <Button
                      key={status}
                      variant={packageItem.status === status ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => handleStatusChange(packageItem.id, status)}
                    >
                      {statusLabels[status]}
                    </Button>
                  ))}
                </div>
                {packageItem.notes ? (
                  <p className="mt-3 rounded-md bg-muted p-2 text-xs text-muted-foreground">
                    {packageItem.notes}
                  </p>
                ) : null}
              </div>
            ))}
            {packages.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No packages logged yet today. Use the form above to intake the first
                delivery.
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
