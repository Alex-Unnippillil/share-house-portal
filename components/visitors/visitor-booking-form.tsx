"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { differenceInCalendarDays, format, isWeekend } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import useSupabaseBrowser from "@/utils/supabase-browser"

const visitorBookingSchema = z
  .object({
    guestName: z.string().min(2, "Guest name must be at least 2 characters"),
    guestEmail: z.string().email("Please enter a valid email address"),
    guestPhone: z.string().optional(),
    hostRoommateId: z.string().uuid("Select the host roommate"),
    arrivalDate: z.date({ required_error: "Arrival date is required" }),
    departureDate: z.date({ required_error: "Departure date is required" }),
    reason: z.string().min(10, "Please provide at least 10 characters"),
    emergencyContact: z.string().optional(),
    specialNotes: z.string().optional(),
  })
  .refine((value) => value.departureDate > value.arrivalDate, {
    message: "Departure must be after arrival",
    path: ["departureDate"],
  })

type VisitorBookingFormData = z.infer<typeof visitorBookingSchema>

type UnitMember = {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
}

export function VisitorBookingForm() {
  const supabase = useSupabaseBrowser()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [unitMembers, setUnitMembers] = useState<UnitMember[]>([])

  const form = useForm<VisitorBookingFormData>({
    resolver: zodResolver(visitorBookingSchema),
    defaultValues: {
      guestName: "",
      guestEmail: "",
      guestPhone: "",
      hostRoommateId: "",
      reason: "",
      emergencyContact: "",
      specialNotes: "",
    },
  })

  useEffect(() => {
    async function loadMembers() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("unit_id")
        .eq("id", user.id)
        .maybeSingle()

      if (!profile?.unit_id) return

      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("unit_id", profile.unit_id)
        .in("role", ["tenant", "roommate"])

      const members = (data ?? []) as UnitMember[]
      setUnitMembers(members)
      if (members[0]) {
        form.setValue("hostRoommateId", members[0].id)
      }
    }

    void loadMembers()
  }, [form, supabase])

  const hostOptions = useMemo(
    () =>
      unitMembers.map((member) => ({
        id: member.id,
        label: member.full_name ?? member.email ?? "Unknown roommate",
      })),
    [unitMembers]
  )

  const arrivalDate = form.watch("arrivalDate")
  const departureDate = form.watch("departureDate")

  const staySummary = useMemo(() => {
    if (!arrivalDate || !departureDate) {
      return {
        totalNights: null,
        includesWeekend: false,
        exceedsPolicy: false,
      }
    }

    const totalNights = differenceInCalendarDays(departureDate, arrivalDate)
    const dayCount = Math.max(totalNights, 0)
    const includesWeekend = Array.from({ length: dayCount }).some((_, index) =>
      isWeekend(new Date(arrivalDate.getFullYear(), arrivalDate.getMonth(), arrivalDate.getDate() + index))
    )

    return {
      totalNights,
      includesWeekend,
      exceedsPolicy: totalNights > 3,
    }
  }, [arrivalDate, departureDate])

  const onSubmit = async (data: VisitorBookingFormData) => {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: data.guestName,
          guestEmail: data.guestEmail,
          guestPhone: data.guestPhone,
          hostRoommateId: data.hostRoommateId,
          arrivalDate: data.arrivalDate.toISOString(),
          departureDate: data.departureDate.toISOString(),
          reason: data.reason,
          emergencyContact: data.emergencyContact,
          specialNotes: data.specialNotes,
        }),
      })

      const payload = (await response.json()) as {
        error?: { message?: string; details?: { violations?: string[] } }
      }

      if (!response.ok) {
        const violations = payload.error?.details?.violations ?? []
        const reason = violations.length > 0 ? violations.join(" • ") : payload.error?.message

        throw new Error(reason ?? "Failed to submit visitor request")
      }

      toast({
        title: "Visitor request submitted",
        description: "Roommates and managers were notified.",
      })
      form.reset()
    } catch (error) {
      toast({
        title: "Unable to submit",
        description: error instanceof Error ? error.message : "Request failed",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="guestName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Guest full name *</FormLabel>
                <FormControl>
                  <Input placeholder="Jordan Smith" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="guestEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Guest email *</FormLabel>
                <FormControl>
                  <Input placeholder="guest@example.com" type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="guestPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Guest phone</FormLabel>
                <FormControl>
                  <Input placeholder="+1 555 123 4567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hostRoommateId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Host roommate *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select host roommate" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {hostOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="arrivalDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Arrival *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 size-4" />
                        {field.value ? format(field.value, "PPP") : "Pick arrival date"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="departureDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Departure *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 size-4" />
                        {field.value ? format(field.value, "PPP") : "Pick departure date"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="rounded-lg border bg-muted/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Policy preview</p>
            {staySummary.totalNights !== null ? (
              <Badge variant={staySummary.exceedsPolicy ? "destructive" : "secondary"}>
                {staySummary.totalNights} night{staySummary.totalNights === 1 ? "" : "s"}
              </Badge>
            ) : (
              <Badge variant="outline">Pick dates to evaluate</Badge>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Stays over 3 nights are routed for manager review. Weekend stays can trigger additional quiet-hour reminders.
          </p>
          {staySummary.includesWeekend ? (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              This request includes Friday/Saturday nights. Notify roommates early to avoid scheduling conflicts.
            </p>
          ) : null}
        </div>

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason for stay *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Why is the guest staying overnight? Include context for roommates and manager review."
                  className="min-h-[90px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="emergencyContact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Emergency contact</FormLabel>
                <FormControl>
                  <Input placeholder="Name + phone" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="specialNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Special notes</FormLabel>
                <FormControl>
                  <Input placeholder="Allergies, accessibility, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit visitor request"}
        </Button>
      </form>
    </Form>
  )
}
