"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
        Select,
        SelectContent,
        SelectItem,
        SelectTrigger,
        SelectValue,
} from "@/components/ui/select";
import { exportRowsToCsv } from "./export-utils";

type Booking = {
        id: string;
        amenity: string;
        resident: string;
        status: "confirmed" | "pending" | "cancelled";
        start: string;
        end: string;
        timezone: string;
};

const STATUS_BADGE: Record<Booking["status"], "default" | "secondary" | "destructive"> = {
        confirmed: "default",
        pending: "secondary",
        cancelled: "destructive",
};

const BOOKINGS: Booking[] = [
        {
                id: "b1",
                amenity: "Chef's Kitchen",
                resident: "Amelia W.",
                status: "confirmed",
                start: "2024-07-12T18:00:00",
                end: "2024-07-12T20:00:00",
                timezone: "America/Los_Angeles",
        },
        {
                id: "b2",
                amenity: "Cinema Room",
                resident: "Diego R.",
                status: "pending",
                start: "2024-07-13T21:00:00",
                end: "2024-07-13T23:30:00",
                timezone: "America/Los_Angeles",
        },
        {
                id: "b3",
                amenity: "Tesla Charger",
                resident: "Nia K.",
                status: "confirmed",
                start: "2024-07-13T08:00:00",
                end: "2024-07-13T09:00:00",
                timezone: "America/Los_Angeles",
        },
        {
                id: "b4",
                amenity: "Guest Suite",
                resident: "Pauline T.",
                status: "pending",
                start: "2024-07-15T15:00:00",
                end: "2024-07-16T11:00:00",
                timezone: "America/Los_Angeles",
        },
        {
                id: "b5",
                amenity: "Cinema Room",
                resident: "Haruto S.",
                status: "cancelled",
                start: "2024-07-10T19:00:00",
                end: "2024-07-10T21:00:00",
                timezone: "America/Los_Angeles",
        },
];

type StatusFilter = "all" | Booking["status"];

export function BookingCalendarPanel() {
        const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
        const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
        const [search, setSearch] = useState("");

        const groupedBookings = useMemo(() => {
                return BOOKINGS.reduce<Record<string, Booking[]>>((acc, booking) => {
                        const key = format(parseISO(booking.start), "yyyy-MM-dd");
                        acc[key] = acc[key] ? [...acc[key], booking] : [booking];
                        return acc;
                }, {});
        }, []);

        const eventsForSelectedDate = useMemo(() => {
                if (!selectedDate) {
                        return [];
                }

                const key = format(selectedDate, "yyyy-MM-dd");
                const events = groupedBookings[key] ?? [];

                return events.filter((event) => {
                        const matchesStatus = statusFilter === "all" ? true : event.status === statusFilter;
                        const matchesSearch =
                                search.length === 0
                                        ? true
                                        : `${event.amenity} ${event.resident}`
                                                  .toLowerCase()
                                                  .includes(search.toLowerCase());

                        return matchesStatus && matchesSearch;
                });
        }, [groupedBookings, selectedDate, statusFilter, search]);

        const modifiers = useMemo(() => {
                return {
                        booked: BOOKINGS.map((booking) => parseISO(booking.start)),
                        pending: BOOKINGS.filter((booking) => booking.status === "pending").map((booking) =>
                                parseISO(booking.start)
                        ),
                };
        }, []);

        const exportBookings = () => {
                if (!eventsForSelectedDate.length) {
                        return;
                }

                exportRowsToCsv(
                        `bookings-${format(selectedDate!, "yyyy-MM-dd")}.csv`,
                        eventsForSelectedDate.map((event) => ({
                                amenity: event.amenity,
                                resident: event.resident,
                                start: format(parseISO(event.start), "PPpp"),
                                end: format(parseISO(event.end), "PPpp"),
                                status: event.status,
                        }))
                );
        };

        const stats = useMemo(() => {
                return {
                        total: BOOKINGS.length,
                        pending: BOOKINGS.filter((booking) => booking.status === "pending").length,
                        cancelled: BOOKINGS.filter((booking) => booking.status === "cancelled").length,
                };
        }, []);

        return (
                <Card>
                        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                        <CardTitle className="text-2xl font-semibold">Booking calendar</CardTitle>
                                        <CardDescription>
                                                Review Cal.com reservations and intervene when conflicts arise.
                                        </CardDescription>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                        <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
                                                <SelectTrigger className="w-[140px]">
                                                        <SelectValue placeholder="Status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                        <SelectItem value="all">All statuses</SelectItem>
                                                        <SelectItem value="confirmed">Confirmed</SelectItem>
                                                        <SelectItem value="pending">Pending</SelectItem>
                                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                                </SelectContent>
                                        </Select>
                                        <Input
                                                placeholder="Search amenity or resident"
                                                className="w-60"
                                                value={search}
                                                onChange={(event) => setSearch(event.target.value)}
                                        />
                                        <Button variant="outline" onClick={exportBookings}>
                                                Export day
                                        </Button>
                                </div>
                        </CardHeader>
                        <CardContent className="grid gap-6 lg:grid-cols-2">
                                <div className="space-y-4">
                                        <div className="grid grid-cols-3 gap-3">
                                                <BookingStat label="Total this week" value={stats.total} />
                                                <BookingStat label="Pending" value={stats.pending} />
                                                <BookingStat label="Cancelled" value={stats.cancelled} />
                                        </div>
                                        <Calendar
                                                mode="single"
                                                selected={selectedDate}
                                                onSelect={setSelectedDate}
                                                modifiers={modifiers}
                                                modifiersStyles={{
                                                        booked: { backgroundColor: "hsl(var(--primary))", color: "white" },
                                                        pending: { backgroundColor: "hsl(var(--secondary))", color: "black" },
                                                }}
                                                className="rounded-md border"
                                        />
                                </div>
                                <div className="space-y-3">
                                        <div>
                                                <Label className="text-sm font-medium uppercase text-muted-foreground">
                                                        {selectedDate ? format(selectedDate, "EEEE, MMM d") : "Select a date"}
                                                </Label>
                                                <p className="text-sm text-muted-foreground">
                                                        {eventsForSelectedDate.length} bookings match your filters.
                                                </p>
                                        </div>
                                        <div className="space-y-2">
                                                {eventsForSelectedDate.length === 0 ? (
                                                        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                                                                No bookings to review.
                                                        </div>
                                                ) : (
                                                        eventsForSelectedDate.map((event) => (
                                                                <div
                                                                        key={event.id}
                                                                        className="rounded-lg border border-border bg-background p-4"
                                                                >
                                                                        <div className="flex items-center justify-between">
                                                                                <div>
                                                                                        <p className="text-sm font-semibold">
                                                                                                {event.amenity}
                                                                                        </p>
                                                                                        <p className="text-xs text-muted-foreground">
                                                                                                {format(parseISO(event.start), "p")} -
                                                                                                {" "}
                                                                                                {format(parseISO(event.end), "p zzz")}
                                                                                        </p>
                                                                                </div>
                                                                                <Badge variant={STATUS_BADGE[event.status]}>{event.status}</Badge>
                                                                        </div>
                                                                        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                                                                                <span>Host: {event.resident}</span>
                                                                                <span>{event.timezone}</span>
                                                                        </div>
                                                                        <div className="mt-3 flex gap-2 text-xs">
                                                                                <Button size="sm" variant="outline">
                                                                                        Approve &amp; notify
                                                                                </Button>
                                                                                <Button size="sm" variant="ghost" className="text-destructive">
                                                                                        Cancel booking
                                                                                </Button>
                                                                        </div>
                                                                </div>
                                                        ))
                                                )}
                                        </div>
                                </div>
                        </CardContent>
                </Card>
        );
}

type BookingStatProps = {
        label: string;
        value: number;
};

function BookingStat({ label, value }: BookingStatProps) {
        return (
                <div className="rounded-lg border border-border bg-background p-3 text-center">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
                        <p className="mt-1 text-xl font-semibold">{value}</p>
                </div>
        );
}
