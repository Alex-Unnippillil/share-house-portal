"use client"

import { useCallback, useMemo, useState } from "react"
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  PartyPopper,
  Search,
  ShieldCheck,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react"
import { format, isWithinInterval, parseISO } from "date-fns"
import { eachDayOfInterval } from "date-fns/eachDayOfInterval"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

const CURRENT_MEMBER = "Jordan Lee"
const DEFAULT_DATE = parseISO("2025-01-15")

type SlotTemplate = {
  id: string
  name: string
  startTime: string
  endTime: string
  tags: string[]
}

type RuleHint = {
  id: string
  title: string
  detail: string
  icon: LucideIcon
}

type BlackoutPeriod = {
  id: string
  start: Date
  end: Date
  reason: string
}

type Amenity = {
  id: string
  name: string
  description: string
  dailyQuota: number
  requiresApproval: boolean
  rules: RuleHint[]
  slotTemplates: SlotTemplate[]
  blackoutPeriods: BlackoutPeriod[]
}

type BookingStatus = "pending" | "confirmed" | "cancelled"

type Booking = {
  id: string
  amenityId: string
  date: string
  startTime: string
  endTime: string
  attendee: string
  status: BookingStatus
  requiresApproval: boolean
  approvedBy?: string | null
  notes?: string
}

type SlotWithState = SlotTemplate & {
  label: string
  isBooked: boolean
  bookedBy?: string
  isBlackout: boolean
  blackoutReason?: string
}

const AMENITIES: Amenity[] = [
  {
    id: "sky-lounge",
    name: "Sky Lounge",
    description:
      "Panoramic lounge with gourmet kitchen access, perfect for celebrations and off-sites.",
    dailyQuota: 3,
    requiresApproval: true,
    rules: [
      {
        id: "approval",
        title: "Host approval",
        detail: "Events over 12 guests require concierge approval at least 48 hours in advance.",
        icon: ShieldCheck,
      },
      {
        id: "cleanup",
        title: "Cleanup buffer",
        detail: "A 30 minute buffer is automatically blocked before and after each event for turnover.",
        icon: Clock,
      },
      {
        id: "catering",
        title: "Catering ready",
        detail: "Kitchen equipment and AV remotes are staged once a booking is approved.",
        icon: PartyPopper,
      },
    ],
    slotTemplates: [
      {
        id: "sunrise-reset",
        name: "Sunrise Reset",
        startTime: "08:00",
        endTime: "10:00",
        tags: ["quiet", "sunrise"],
      },
      {
        id: "chef-demo",
        name: "Chef Demo",
        startTime: "12:00",
        endTime: "14:00",
        tags: ["catering", "lunch"],
      },
      {
        id: "sunset-social",
        name: "Sunset Social",
        startTime: "16:00",
        endTime: "18:00",
        tags: ["sunset", "networking"],
      },
      {
        id: "moonlight-mixer",
        name: "Moonlight Mixer",
        startTime: "19:00",
        endTime: "21:00",
        tags: ["evening", "music"],
      },
    ],
    blackoutPeriods: [
      {
        id: "floor-care",
        start: parseISO("2025-01-20T00:00:00"),
        end: parseISO("2025-01-21T23:59:59"),
        reason: "Floor resealing and chandelier maintenance",
      },
      {
        id: "vip-retreat",
        start: parseISO("2025-02-05T12:00:00"),
        end: parseISO("2025-02-07T23:00:00"),
        reason: "Private corporate retreat",
      },
    ],
  },
  {
    id: "maker-lab",
    name: "Maker Lab",
    description:
      "Reservable fabrication studio with laser cutter, VR prototyping rigs, and print farm.",
    dailyQuota: 4,
    requiresApproval: false,
    rules: [
      {
        id: "orientation",
        title: "Orientation required",
        detail: "Residents must complete the safety orientation before reserving equipment.",
        icon: Users,
      },
      {
        id: "materials",
        title: "Supply policy",
        detail: "Bring your own materials or purchase filament packs from the concierge desk.",
        icon: FileText,
      },
    ],
    slotTemplates: [
      {
        id: "prototype-sprint",
        name: "Prototype Sprint",
        startTime: "09:00",
        endTime: "11:00",
        tags: ["laser", "cnc"],
      },
      {
        id: "open-build",
        name: "Open Build",
        startTime: "11:30",
        endTime: "13:30",
        tags: ["print", "robotics"],
      },
      {
        id: "evening-lab",
        name: "Evening Lab",
        startTime: "17:30",
        endTime: "19:30",
        tags: ["robotics", "team"],
      },
    ],
    blackoutPeriods: [
      {
        id: "inventory",
        start: parseISO("2025-01-22T08:00:00"),
        end: parseISO("2025-01-22T18:00:00"),
        reason: "Quarterly equipment calibration",
      },
    ],
  },
]

const INITIAL_BOOKINGS: Booking[] = [
  {
    id: "booking-sky-1",
    amenityId: "sky-lounge",
    date: "2025-01-15",
    startTime: "12:00",
    endTime: "14:00",
    attendee: CURRENT_MEMBER,
    status: "confirmed",
    requiresApproval: true,
    approvedBy: "Community Manager",
    notes: "Product launch lunch",
  },
  {
    id: "booking-sky-2",
    amenityId: "sky-lounge",
    date: "2025-01-15",
    startTime: "19:00",
    endTime: "21:00",
    attendee: "Alex Morgan",
    status: "pending",
    requiresApproval: true,
    approvedBy: null,
    notes: "Birthday celebration",
  },
  {
    id: "booking-lab-1",
    amenityId: "maker-lab",
    date: "2025-01-15",
    startTime: "09:00",
    endTime: "11:00",
    attendee: "Priya Patel",
    status: "confirmed",
    requiresApproval: false,
    approvedBy: "Auto-approve",
    notes: "Prototype sprint",
  },
]

function combineDateAndTime(baseDate: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number)
  const combined = new Date(baseDate)
  combined.setHours(hours, minutes, 0, 0)
  return combined
}

function formatRange(start: Date, end: Date) {
  return `${format(start, "h:mm a")} – ${format(end, "h:mm a")}`
}

function formatStatus(status: BookingStatus) {
  switch (status) {
    case "confirmed":
      return "Confirmed"
    case "pending":
      return "Pending approval"
    case "cancelled":
      return "Cancelled"
  }
}

function statusBadgeClass(status: BookingStatus) {
  switch (status) {
    case "confirmed":
      return "bg-emerald-100 text-emerald-700 border-emerald-200"
    case "pending":
      return "bg-amber-100 text-amber-700 border-amber-200"
    case "cancelled":
      return "bg-slate-200 text-slate-600 border-slate-300"
  }
}

function formatIcsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
}

function getAmenityById(id: string) {
  return AMENITIES.find((amenity) => amenity.id === id)
}

const blackoutModifiers = (dates: Date[]) => ({
  blackout: dates,
})

const blackoutStyles = {
  blackout: {
    backgroundColor: "rgba(220, 38, 38, 0.18)",
    color: "#991b1b",
  },
}

export default function AmenitiesFeatureExperience() {
  const [selectedAmenityId, setSelectedAmenityId] = useState<string>(AMENITIES[0]?.id ?? "")
  const [selectedDate, setSelectedDate] = useState<Date>(DEFAULT_DATE)
  const [searchTerm, setSearchTerm] = useState("")
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS)
  const [slotDialogOpen, setSlotDialogOpen] = useState(false)
  const [slotToBook, setSlotToBook] = useState<SlotWithState | null>(null)

  const selectedAmenity = useMemo(
    () => AMENITIES.find((amenity) => amenity.id === selectedAmenityId) ?? AMENITIES[0],
    [selectedAmenityId]
  )

  const selectedDateKey = useMemo(() => format(selectedDate, "yyyy-MM-dd"), [selectedDate])

  const blackoutDates = useMemo(() => {
    if (!selectedAmenity) {
      return []
    }
    return selectedAmenity.blackoutPeriods.flatMap((period) =>
      eachDayOfInterval({ start: period.start, end: period.end })
    )
  }, [selectedAmenity])

  const dayBlackout = useMemo(() => {
    if (!selectedAmenity) {
      return null
    }
    return (
      selectedAmenity.blackoutPeriods.find((period) =>
        isWithinInterval(selectedDate, { start: period.start, end: period.end })
      ) ?? null
    )
  }, [selectedAmenity, selectedDate])

  const normalizedSearch = searchTerm.trim().toLowerCase()

  const activeBookingsForDay = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking.amenityId === selectedAmenity?.id &&
          booking.date === selectedDateKey &&
          booking.status !== "cancelled"
      ),
    [bookings, selectedAmenity?.id, selectedDateKey]
  )

  const isQuotaReached = (selectedAmenity?.dailyQuota ?? 0) <= activeBookingsForDay.length

  const slotsForDate = useMemo(() => {
    if (!selectedAmenity) {
      return []
    }

    return selectedAmenity.slotTemplates.map<SlotWithState>((slot) => {
      const start = combineDateAndTime(selectedDate, slot.startTime)
      const end = combineDateAndTime(selectedDate, slot.endTime)

      const conflictingBooking = bookings.find(
        (booking) =>
          booking.amenityId === selectedAmenity.id &&
          booking.date === selectedDateKey &&
          booking.startTime === slot.startTime &&
          booking.status !== "cancelled"
      )

      const blackout = selectedAmenity.blackoutPeriods.find((period) =>
        isWithinInterval(start, { start: period.start, end: period.end })
      )

      return {
        ...slot,
        label: `${slot.name} · ${formatRange(start, end)}`,
        isBooked: Boolean(conflictingBooking),
        bookedBy: conflictingBooking?.attendee,
        isBlackout: Boolean(blackout),
        blackoutReason: blackout?.reason,
      }
    })
  }, [bookings, selectedAmenity, selectedDate, selectedDateKey])

  const filteredSlots = useMemo(() => {
    if (!normalizedSearch) {
      return slotsForDate
    }

    return slotsForDate.filter((slot) => {
      const haystack = [slot.name, slot.label, slot.tags.join(" ")].join(" ").toLowerCase()
      return haystack.includes(normalizedSearch)
    })
  }, [normalizedSearch, slotsForDate])

  const myBookings = useMemo(() => {
    return bookings
      .filter(
        (booking) =>
          booking.attendee === CURRENT_MEMBER &&
          booking.amenityId === selectedAmenity?.id
      )
      .sort((a, b) => {
        if (a.date === b.date) {
          return a.startTime.localeCompare(b.startTime)
        }
        return a.date.localeCompare(b.date)
      })
  }, [bookings, selectedAmenity?.id])

  const pendingApprovals = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking.amenityId === selectedAmenity?.id &&
          booking.requiresApproval &&
          booking.status === "pending"
      ),
    [bookings, selectedAmenity?.id]
  )

  const handleSelectSlot = useCallback((slot: SlotWithState) => {
    setSlotToBook(slot)
    setSlotDialogOpen(true)
  }, [])

  const handleConfirmBooking = useCallback(() => {
    if (!slotToBook || !selectedAmenity) {
      return
    }

    if (slotToBook.isBooked) {
      toast({
        title: "Slot already reserved",
        description: "Choose another window or search for a different amenity.",
        variant: "destructive",
      })
      return
    }

    if (slotToBook.isBlackout || dayBlackout) {
      toast({
        title: "Blackout in effect",
        description: "This amenity is unavailable during the selected window.",
        variant: "destructive",
      })
      return
    }

    if (isQuotaReached) {
      toast({
        title: "Daily quota reached",
        description: "Select another day or amenity with availability.",
        variant: "destructive",
      })
      return
    }

    const bookingId = `booking-${selectedAmenity.id}-${slotToBook.id}-${Date.now()}`

    const newBooking: Booking = {
      id: bookingId,
      amenityId: selectedAmenity.id,
      date: selectedDateKey,
      startTime: slotToBook.startTime,
      endTime: slotToBook.endTime,
      attendee: CURRENT_MEMBER,
      status: selectedAmenity.requiresApproval ? "pending" : "confirmed",
      requiresApproval: selectedAmenity.requiresApproval,
      approvedBy: selectedAmenity.requiresApproval ? null : "Auto-approve",
      notes: `${slotToBook.name} reservation`,
    }

    setBookings((prev) => [...prev, newBooking])
    setSlotDialogOpen(false)
    setSlotToBook(null)

    toast({
      title: selectedAmenity.requiresApproval ? "Booking submitted for approval" : "Booking confirmed",
      description: selectedAmenity.requiresApproval
        ? "The concierge team will review and approve this reservation shortly."
        : "Your slot is confirmed and ready to add to your calendar.",
    })
  }, [dayBlackout, isQuotaReached, selectedAmenity, selectedDateKey, slotToBook])

  const handleCancelBooking = useCallback((bookingId: string) => {
    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === bookingId ? { ...booking, status: "cancelled" } : booking
      )
    )
    toast({
      title: "Reservation cancelled",
      description: "The slot is now released back to the calendar.",
    })
  }, [])

  const handleApprove = useCallback((bookingId: string) => {
    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === bookingId
          ? {
              ...booking,
              status: "confirmed",
              approvedBy: "Community Manager",
            }
          : booking
      )
    )
    toast({
      title: "Booking approved",
      description: "The resident has been notified and can download their ICS file.",
    })
  }, [])

  const handleReject = useCallback((bookingId: string) => {
    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === bookingId
          ? {
              ...booking,
              status: "cancelled",
              approvedBy: "Community Manager",
            }
          : booking
      )
    )
    toast({
      title: "Booking declined",
      description: "Residents receive a notification with alternative suggestions.",
    })
  }, [])

  const handleDownloadIcs = useCallback((booking: Booking) => {
    const amenity = getAmenityById(booking.amenityId)
    if (!amenity) return

    const date = parseISO(booking.date)
    const start = combineDateAndTime(date, booking.startTime)
    const end = combineDateAndTime(date, booking.endTime)

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Share House Portal//Amenities//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${booking.id}@share-house-portal`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:${amenity.name} reservation`,
      `DESCRIPTION:Reserved by ${booking.attendee}${booking.notes ? ` — ${booking.notes}` : ""}`,
      `LOCATION:${amenity.name}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n")

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${amenity.name.toLowerCase().replace(/\s+/g, "-")}-${booking.id}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({
      title: "Calendar file ready",
      description: "An .ics file has been generated for your reservation.",
    })
  }, [])

  const quotaPercentage = selectedAmenity
    ? Math.min(100, Math.round((activeBookingsForDay.length / selectedAmenity.dailyQuota) * 100))
    : 0

  return (
    <div className="container mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12">
      <header className="space-y-3 text-center">
        <Badge variant="outline" className="px-3 py-1 text-sm">
          Amenities Command Center
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Calendar-driven amenity reservations
        </h1>
        <p className="mx-auto max-w-3xl text-muted-foreground">
          Explore how residents search for slots, receive instant policy hints, download calendar invites,
          and how your team keeps control with quotas, blackout periods, and streamlined approvals.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">Amenity selection</CardTitle>
            <CardDescription>
              Compare reservation rules, real-time availability, and blackout planning across amenities.
            </CardDescription>
          </div>
          <Select
            value={selectedAmenity?.id}
            onValueChange={(value) => {
              setSelectedAmenityId(value)
              setSearchTerm("")
            }}
          >
            <SelectTrigger className="w-full min-w-[220px] lg:w-[280px]" data-testid="amenity-select">
              <SelectValue placeholder="Choose an amenity" />
            </SelectTrigger>
            <SelectContent>
              {AMENITIES.map((amenity) => (
                <SelectItem key={amenity.id} value={amenity.id}>
                  {amenity.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <div className="space-y-4">
              <Card className="border-muted shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <CalendarDays className="size-5 text-primary" /> Reservation calendar
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Blackout dates display in red so residents can plan around maintenance windows.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Calendar
                    mode="single"
                    defaultMonth={selectedDate}
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    modifiers={blackoutModifiers(blackoutDates)}
                    modifiersStyles={blackoutStyles}
                  />
                </CardContent>
              </Card>

              <div className="rounded-lg border border-muted bg-muted/20 p-4 text-sm">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="size-4 text-primary" />
                  Policy hints
                </div>
                <Separator className="my-3" />
                <div className="flex flex-wrap gap-2">
                  {selectedAmenity?.rules.map((rule) => (
                    <HoverCard key={rule.id}>
                      <HoverCardTrigger asChild>
                        <Badge variant="outline" className="cursor-help gap-1 px-2 py-1">
                          <rule.icon className="size-4" />
                          {rule.title}
                        </Badge>
                      </HoverCardTrigger>
                      <HoverCardContent side="top" className="max-w-xs text-sm">
                        {rule.detail}
                      </HoverCardContent>
                    </HoverCard>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-muted bg-background px-3 py-1 text-sm">
                  <Users className="size-4 text-primary" />
                  <span>{selectedAmenity?.requiresApproval ? "Concierge approval required" : "Instant book amenity"}</span>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-muted bg-background px-3 py-1 text-sm">
                  <Clock className="size-4 text-primary" />
                  <span>
                    Daily quota {activeBookingsForDay.length}/{selectedAmenity?.dailyQuota}
                  </span>
                </div>
                {dayBlackout ? (
                  <div className="flex items-center gap-2 rounded-full border border-destructive bg-destructive/10 px-3 py-1 text-sm text-destructive">
                    <Ban className="size-4" />
                    <span>Blackout: {dayBlackout.reason}</span>
                  </div>
                ) : null}
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Available slots</h2>
                    <p className="text-sm text-muted-foreground">
                      Search by experience name, time, or keyword to find the perfect window.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-md border border-muted px-3 py-2 text-sm">
                    <Search className="size-4 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search slots"
                      className="h-6 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
                      data-testid="slot-search"
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-4" data-testid="available-slots">
                  {filteredSlots.map((slot) => {
                    const disabled =
                      slot.isBooked ||
                      slot.isBlackout ||
                      isQuotaReached ||
                      Boolean(dayBlackout)

                    return (
                      <Card
                        key={slot.id}
                        className={cn(
                          "transition-shadow hover:shadow-md",
                          slot.isBooked && "border-muted-foreground/30",
                          slot.isBlackout && "border-destructive text-destructive"
                        )}
                        data-testid={`slot-card-${slot.id}`}
                      >
                        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-base font-semibold">
                              {slot.name}
                            </CardTitle>
                            <CardDescription className="text-sm">{slot.label}</CardDescription>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {slot.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="uppercase tracking-wide">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 pt-0 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            {slot.isBooked ? (
                              <span className="flex items-center gap-2">
                              <XCircle className="size-4 text-muted-foreground" />
                                Reserved by {slot.bookedBy}
                              </span>
                            ) : slot.isBlackout ? (
                              <span className="flex items-center gap-2 text-destructive">
                              <Ban className="size-4" />
                                {slot.blackoutReason}
                              </span>
                            ) : (
                              <span className="flex items-center gap-2 text-emerald-600">
                              <CheckCircle2 className="size-4" />
                                Open for booking
                              </span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            disabled={disabled}
                            onClick={() => handleSelectSlot(slot)}
                            data-testid={`book-slot-${slot.id}`}
                          >
                            {slot.isBooked
                              ? "Unavailable"
                              : isQuotaReached
                                ? "Quota reached"
                                : dayBlackout
                                  ? "Blackout"
                                  : `Book ${slot.name}`}
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  })}

                  {filteredSlots.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-muted-foreground/50 p-6 text-center text-sm text-muted-foreground">
                      No slots match that search. Try a different keyword or switch amenities.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Quota utilization</span>
                  <span>
                    {activeBookingsForDay.length} of {selectedAmenity?.dailyQuota} bookings
                  </span>
                </div>
                <Progress value={quotaPercentage} className="h-2" />
              </div>

              <div className="rounded-lg border border-muted p-4 text-sm">
                <div className="mb-2 flex items-center gap-2 font-medium">
                  <Ban className="size-4 text-primary" /> Upcoming blackout periods
                </div>
                <ul className="space-y-2">
                  {selectedAmenity?.blackoutPeriods.map((period) => (
                    <li key={period.id} className="flex items-start gap-2">
                      <span className="mt-1 inline-flex size-2 flex-none rounded-full bg-destructive" />
                      <span>
                        <span className="font-medium">{format(period.start, "MMM d")}</span>
                        {" – "}
                        <span className="font-medium">{format(period.end, "MMM d")}</span>
                        <span className="block text-muted-foreground">{period.reason}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="member" className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="member">Resident booking journey</TabsTrigger>
          <TabsTrigger value="admin">Admin approvals & governance</TabsTrigger>
        </TabsList>

        <TabsContent value="member" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My reservations</CardTitle>
              <CardDescription>
                Residents can view, download, or cancel their amenity bookings in real time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-full max-h-[320px] pr-4" data-testid="my-bookings">
                <div className="space-y-4">
                  {myBookings.map((booking) => {
                    const amenity = getAmenityById(booking.amenityId)
                    const statusClass = statusBadgeClass(booking.status)

                    return (
                      <div
                        key={booking.id}
                        className="rounded-lg border border-muted bg-background p-4 shadow-sm"
                        data-testid={`my-booking-${booking.id}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CalendarDays className="size-4" />
                              <span>{format(parseISO(booking.date), "MMM d, yyyy")}</span>
                              <span aria-hidden="true">•</span>
                              <span>
                                {formatRange(
                                  combineDateAndTime(parseISO(booking.date), booking.startTime),
                                  combineDateAndTime(parseISO(booking.date), booking.endTime)
                                )}
                              </span>
                            </div>
                            <div className="mt-1 text-base font-semibold">{amenity?.name}</div>
                            {booking.notes ? (
                              <p className="text-sm text-muted-foreground">{booking.notes}</p>
                            ) : null}
                          </div>
                          <Badge className={cn("border", statusClass)}>{formatStatus(booking.status)}</Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={booking.status !== "confirmed"}
                            onClick={() => handleDownloadIcs(booking)}
                            data-testid={`download-ics-${booking.id}`}
                          >
                            <Download className="mr-2 size-4" /> Download ICS
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={booking.status === "cancelled"}
                            onClick={() => handleCancelBooking(booking.id)}
                            data-testid={`cancel-booking-${booking.id}`}
                          >
                            Cancel booking
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  {myBookings.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-muted-foreground/40 p-6 text-center text-sm text-muted-foreground">
                      No reservations yet. Use the calendar above to reserve your first experience.
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Pending approvals</CardTitle>
                <CardDescription>
                  Concierge staff triage requests that exceed capacity rules or require manual review.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4" data-testid="pending-approvals">
                  {pendingApprovals.length > 0 ? (
                    pendingApprovals.map((booking) => {
                      const amenity = getAmenityById(booking.amenityId)
                      return (
                        <div
                          key={booking.id}
                          className="rounded-lg border border-muted bg-muted/20 p-4"
                          data-testid={`pending-booking-${booking.id}`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                            <div className="font-medium">{amenity?.name}</div>
                            <span className="text-muted-foreground">
                              {format(parseISO(booking.date), "MMM d, yyyy")} · {booking.startTime}–{booking.endTime}
                            </span>
                          </div>
                          {booking.notes ? (
                            <p className="mt-1 text-sm text-muted-foreground">{booking.notes}</p>
                          ) : null}
                          <div className="mt-3 flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(booking.id)}
                              data-testid={`approve-booking-${booking.id}`}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(booking.id)}
                              data-testid={`reject-booking-${booking.id}`}
                            >
                              Decline
                            </Button>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="rounded-lg border border-dashed border-muted-foreground/40 p-6 text-center text-sm text-muted-foreground">
                      All caught up — nothing awaiting review.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>All reservations</CardTitle>
                <CardDescription>Live state of every booking, including approved and cancelled slots.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-full max-h-[320px] pr-4" data-testid="all-bookings">
                  <div className="space-y-4">
                    {bookings
                      .filter((booking) => booking.amenityId === selectedAmenity?.id)
                      .sort((a, b) => {
                        if (a.date === b.date) {
                          return a.startTime.localeCompare(b.startTime)
                        }
                        return a.date.localeCompare(b.date)
                      })
                      .map((booking) => {
                        const amenity = getAmenityById(booking.amenityId)
                        const statusClass = statusBadgeClass(booking.status)
                        return (
                          <div
                            key={booking.id}
                            className="rounded-lg border border-muted bg-background p-4"
                            data-testid={`admin-booking-${booking.id}`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <CalendarDays className="size-4" />
                                  <span>{format(parseISO(booking.date), "MMM d, yyyy")}</span>
                                  <span aria-hidden="true">•</span>
                                  <span>
                                    {formatRange(
                                      combineDateAndTime(parseISO(booking.date), booking.startTime),
                                      combineDateAndTime(parseISO(booking.date), booking.endTime)
                                    )}
                                  </span>
                                </div>
                                <div className="mt-1 text-base font-semibold">{amenity?.name}</div>
                                <p className="text-sm text-muted-foreground">Resident: {booking.attendee}</p>
                                {booking.notes ? (
                                  <p className="text-xs text-muted-foreground">{booking.notes}</p>
                                ) : null}
                              </div>
                              <Badge className={cn("border", statusClass)}>{formatStatus(booking.status)}</Badge>
                            </div>
                            {booking.approvedBy ? (
                              <p className="mt-2 text-xs text-muted-foreground">Handled by {booking.approvedBy}</p>
                            ) : null}
                          </div>
                        )
                      })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm reservation</DialogTitle>
            <DialogDescription>
              Review the reservation details and confirm your booking for the {selectedAmenity?.name}.
            </DialogDescription>
          </DialogHeader>
          {slotToBook ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-primary" />
                <span>{format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                <span>
                  {formatRange(
                    combineDateAndTime(selectedDate, slotToBook.startTime),
                    combineDateAndTime(selectedDate, slotToBook.endTime)
                  )}
                </span>
              </div>
              {selectedAmenity?.requiresApproval ? (
                <div className="flex items-center gap-2 text-amber-600">
                  <ShieldCheck className="size-4" />
                  This booking routes to concierge for approval.
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="size-4" />
                  This booking confirms instantly.
                </div>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSlotDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmBooking} data-testid="confirm-booking">
              Confirm booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
