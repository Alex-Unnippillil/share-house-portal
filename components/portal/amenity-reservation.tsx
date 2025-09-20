"use client"

import { useMemo, useState } from "react"
import { addMinutes, format, parse } from "date-fns"
import { ChefHat, Dumbbell, Users, Waves } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const amenities = [
  {
    id: "kitchen",
    name: "Chef's kitchen",
    description: "Reserve exclusive cooking time in the renovated communal kitchen.",
    capacity: 6,
    icon: ChefHat,
  },
  {
    id: "studio",
    name: "Wellness studio",
    description: "Quiet yoga and meditation studio with mats, blocks, and adjustable lighting.",
    capacity: 4,
    icon: Waves,
  },
  {
    id: "gym",
    name: "Garage gym",
    description: "Weights, rowing machine, and resistance training equipment.",
    capacity: 3,
    icon: Dumbbell,
  },
]

type AmenityReservation = {
  id: string
  amenityId: string
  date: string
  start: Date
  end: Date
  attendees: number
  notes?: string
  status: "Reserved" | "Pending"
}

function getAmenity(amenityId: string) {
  return amenities.find((item) => item.id === amenityId) ?? amenities[0]
}

export function AmenityReservation() {
  const [selectedAmenity, setSelectedAmenity] = useState(amenities[0].id)
  const [reservationDate, setReservationDate] = useState(() => format(new Date(), "yyyy-MM-dd"))
  const [startTime, setStartTime] = useState("18:00")
  const [duration, setDuration] = useState("60")
  const [attendees, setAttendees] = useState("1")
  const [notes, setNotes] = useState("")
  const [reservations, setReservations] = useState<AmenityReservation[]>(() => {
    const now = new Date()
    return [
      {
        id: "AR-1842",
        amenityId: "kitchen",
        date: format(now, "yyyy-MM-dd"),
        start: parse(`${format(now, "yyyy-MM-dd")} 19:00`, "yyyy-MM-dd HH:mm", new Date()),
        end: parse(`${format(now, "yyyy-MM-dd")} 21:00`, "yyyy-MM-dd HH:mm", new Date()),
        attendees: 4,
        status: "Reserved",
        notes: "House dinner prep night.",
      },
      {
        id: "AR-1699",
        amenityId: "studio",
        date: format(addMinutes(now, 1440), "yyyy-MM-dd"),
        start: parse(`${format(addMinutes(now, 1440), "yyyy-MM-dd")} 07:30`, "yyyy-MM-dd HH:mm", new Date()),
        end: parse(`${format(addMinutes(now, 1440), "yyyy-MM-dd")} 08:30`, "yyyy-MM-dd HH:mm", new Date()),
        attendees: 2,
        status: "Pending",
      },
    ]
  })
  const [feedback, setFeedback] = useState<string | null>(null)

  const selectedAmenityDetails = useMemo(() => getAmenity(selectedAmenity), [selectedAmenity])
  const ActiveIcon = selectedAmenityDetails.icon

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const durationMinutes = Number.parseInt(duration, 10)
    const attendeeCount = Number.parseInt(attendees, 10)

    if (Number.isNaN(durationMinutes) || durationMinutes <= 0) {
      setFeedback("Add a valid duration for your reservation.")
      return
    }

    if (Number.isNaN(attendeeCount) || attendeeCount <= 0) {
      setFeedback("Let us know how many people plan to attend.")
      return
    }

    const start = parse(`${reservationDate} ${startTime}`, "yyyy-MM-dd HH:mm", new Date())
    const end = addMinutes(start, durationMinutes)

    const reservation: AmenityReservation = {
      id: `AR-${Math.floor(1000 + Math.random() * 9000)}`,
      amenityId: selectedAmenity,
      date: reservationDate,
      start,
      end,
      attendees: attendeeCount,
      notes: notes.trim() || undefined,
      status: attendeeCount > selectedAmenityDetails.capacity ? "Pending" : "Reserved",
    }

    setReservations((previous) => [reservation, ...previous])
    setFeedback(
      reservation.status === "Reserved"
        ? "Your amenity time is reserved. A confirmation email is on the way."
        : "We will confirm availability shortly because the attendee count exceeds the typical capacity."
    )
    setNotes("")
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ActiveIcon className="h-5 w-5 text-primary" aria-hidden="true" />
              Amenity reservations
            </CardTitle>
            <CardDescription>
              Book time in the shared spaces so everyone can plan ahead.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1 whitespace-nowrap">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            {selectedAmenityDetails.capacity} person capacity
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border bg-muted/30 p-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amenity">Amenity</Label>
                <Select value={selectedAmenity} onValueChange={setSelectedAmenity}>
                  <SelectTrigger id="amenity" className="w-full">
                    <SelectValue placeholder="Select an amenity" />
                  </SelectTrigger>
                  <SelectContent>
                    {amenities.map((amenity) => (
                      <SelectItem key={amenity.id} value={amenity.id}>
                        {amenity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={reservationDate}
                  onChange={(event) => setReservationDate(event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="start-time">Start time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  step="15"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="attendees">Attendees</Label>
                <Input
                  id="attendees"
                  type="number"
                  min="1"
                  value={attendees}
                  onChange={(event) => setAttendees(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reservation-notes">Notes for housemates</Label>
              <Textarea
                id="reservation-notes"
                placeholder="Add menu plans, class focus, or guests joining you."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="min-h-[88px]"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedAmenityDetails.description}
              </p>
              <Button type="submit">Reserve time</Button>
            </div>
          </form>
        </div>
        <div>
          <h4 className="text-sm font-medium">Upcoming reservations</h4>
          <ul className="mt-3 space-y-3">
            {reservations.map((reservation) => {
              const amenity = getAmenity(reservation.amenityId)
              const AmenityIcon = amenity.icon
              return (
                <li
                  key={reservation.id}
                  className="flex flex-col gap-2 rounded-lg border bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <AmenityIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                      <p className="text-sm font-semibold">
                        {amenity.name} · {format(reservation.start, "MMM d")}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {format(reservation.start, "p")} – {format(reservation.end, "p")}
                    </p>
                    <p className="text-xs text-muted-foreground">{reservation.attendees} attendee(s)</p>
                    {reservation.notes ? (
                      <p className="text-xs text-muted-foreground">Note: {reservation.notes}</p>
                    ) : null}
                  </div>
                  <Badge variant={reservation.status === "Reserved" ? "default" : "outline"}>{reservation.status}</Badge>
                </li>
              )
            })}
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start gap-1 text-xs text-muted-foreground">
        {feedback ? <p className="text-sm text-foreground">{feedback}</p> : null}
        <p>Need to cancel? Update the board at least two hours in advance so others can claim the slot.</p>
      </CardFooter>
    </Card>
  )
}
