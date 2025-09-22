"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const

const DAY_LABELS: Record<(typeof DAYS)[number], string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
}

const dayRangeSchema = z
  .object({
    start: z.string().optional(),
    end: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if ((value.start && !value.end) || (!value.start && value.end)) {
      if (!value.start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Start time is required when an end time is provided.",
          path: ["start"],
        })
      }
      if (!value.end) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End time is required when a start time is provided.",
          path: ["end"],
        })
      }
    }

    if (value.start && value.end && value.start >= value.end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be later than the start time.",
        path: ["end"],
      })
    }
  })

const openHoursShape = DAYS.reduce(
  (acc, day) => ({
    ...acc,
    [day]: dayRangeSchema,
  }),
  {} as Record<(typeof DAYS)[number], typeof dayRangeSchema>
)

const openHoursSchema = z.object(openHoursShape)

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  description: z.string().max(500, "Description should be concise.").optional(),
  location: z.string().max(120, "Location is too long.").optional(),
  buffer_minutes: z
    .coerce
    .number({ invalid_type_error: "Buffer must be a whole number." })
    .int("Buffer must be a whole number.")
    .min(0, "Buffer cannot be negative."),
  capacity: z
    .coerce
    .number({ invalid_type_error: "Capacity must be a whole number." })
    .int("Capacity must be a whole number.")
    .min(1, "Capacity must be at least 1."),
  open_hours: openHoursSchema,
})

type FormValues = z.infer<typeof formSchema>

type AmenityPreview = {
  name: string
  description: string | null
  location: string | null
  buffer_minutes: number
  capacity: number
  open_hours: Record<string, { end: string; start: string }[]>
}

const defaultOpenHours = DAYS.reduce(
  (acc, day) => ({
    ...acc,
    [day]: { start: "", end: "" },
  }),
  {} as FormValues["open_hours"]
)

export function AmenityForm() {
  const [preview, setPreview] = useState<AmenityPreview | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      location: "",
      buffer_minutes: 0,
      capacity: 1,
      open_hours: defaultOpenHours,
    },
  })

  function onSubmit(values: FormValues) {
    const openHoursPayload = Object.entries(values.open_hours).reduce(
      (acc, [day, range]) => {
        if (range.start && range.end) {
          acc[day] = [
            {
              start: range.start,
              end: range.end,
            },
          ]
        } else {
          acc[day] = []
        }
        return acc
      },
      {} as AmenityPreview["open_hours"]
    )

    const payload: AmenityPreview = {
      name: values.name.trim(),
      description: values.description?.trim() ? values.description.trim() : null,
      location: values.location?.trim() ? values.location.trim() : null,
      buffer_minutes: values.buffer_minutes,
      capacity: values.capacity,
      open_hours: openHoursPayload,
    }

    setPreview(payload)
  }

  return (
    <div className="space-y-6">
      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <CardHeader>
              <CardTitle>New amenity</CardTitle>
              <CardDescription>
                Capture the baseline configuration for a shared resource. These settings feed Supabase and Cal.com
                automation so bookings respect business rules.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Roof deck" {...field} />
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
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Penthouse, building A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Outline the equipment, etiquette, and any supervision requirements residents should know."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This copy appears in tenant portals alongside the booking calendar.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="buffer_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Buffer minutes</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step={5} placeholder="15" {...field} />
                      </FormControl>
                      <FormDescription>Hold this many minutes before and after every reservation.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} step={1} placeholder="1" {...field} />
                      </FormControl>
                      <FormDescription>Maximum simultaneous participants allowed per booking slot.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold">Open hours</h3>
                  <p className="text-sm text-muted-foreground">
                    Provide daily availability windows using 24-hour time. Leave a day blank when the amenity is closed.
                  </p>
                </div>
                <Separator />
                <div className="space-y-4">
                  {DAYS.map((day) => (
                    <div
                      key={day}
                      className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[140px_1fr_1fr] sm:items-center"
                    >
                      <span className="font-medium capitalize">{DAY_LABELS[day]}</span>
                      <FormField
                        control={form.control}
                        name={`open_hours.${day}.start`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="sr-only">{DAY_LABELS[day]} start time</FormLabel>
                            <FormControl>
                              <Input type="time" step={300} {...field} />
                            </FormControl>
                            <FormDescription>Start</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`open_hours.${day}.end`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="sr-only">{DAY_LABELS[day]} end time</FormLabel>
                            <FormControl>
                              <Input type="time" step={300} {...field} />
                            </FormControl>
                            <FormDescription>End</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="submit">Save configuration</Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {preview ? (
        <Card>
          <CardHeader>
            <CardTitle>Payload preview</CardTitle>
            <CardDescription>
              This is the object that will be persisted to Supabase once a server action is wired up.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap break-words rounded-md bg-muted p-4 text-sm">
              {JSON.stringify(preview, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
