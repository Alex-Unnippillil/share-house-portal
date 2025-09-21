"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
        Dialog,
        DialogContent,
        DialogDescription,
        DialogFooter,
        DialogHeader,
        DialogTitle,
        DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
        Select,
        SelectContent,
        SelectItem,
        SelectTrigger,
        SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { exportRowsToCsv } from "./export-utils";

const STATUS_OPTIONS = [
        { label: "Active", value: "active" },
        { label: "Maintenance", value: "maintenance" },
        { label: "Offline", value: "offline" },
] as const;

type AmenityStatus = (typeof STATUS_OPTIONS)[number]["value"];

type AmenityRecord = {
        id: string;
        name: string;
        property: string;
        category: string;
        status: AmenityStatus;
        location: string;
        capacity: number;
        bookingsThisWeek: number;
        notes: string;
        calendarUrl: string;
};

const createId = () =>
        typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : Math.random().toString(36).slice(2);

const INITIAL_AMENITIES: AmenityRecord[] = [
        {
                id: createId(),
                name: "Chef's Kitchen",
                property: "Onyx House - Mission",
                category: "Kitchen",
                status: "active",
                location: "Level 1",
                capacity: 6,
                bookingsThisWeek: 18,
                notes: "Recurring deep clean scheduled Fridays",
                calendarUrl: "https://cal.com/onyx/kitchen",
        },
        {
                id: createId(),
                name: "Tesla Charger",
                property: "Onyx House - Mission",
                category: "Parking",
                status: "maintenance",
                location: "Garage Bay 2",
                capacity: 1,
                bookingsThisWeek: 9,
                notes: "Awaiting electrician inspection",
                calendarUrl: "https://cal.com/onyx/ev",
        },
        {
                id: createId(),
                name: "Cinema Room",
                property: "Onyx House - Valencia",
                category: "Media",
                status: "active",
                location: "Level 2",
                capacity: 10,
                bookingsThisWeek: 22,
                notes: "Popular for weekend screenings",
                calendarUrl: "https://cal.com/onyx/cinema",
        },
        {
                id: createId(),
                name: "Guest Suite",
                property: "Onyx House - Valencia",
                category: "Overnight",
                status: "offline",
                location: "Level 3",
                capacity: 2,
                bookingsThisWeek: 2,
                notes: "Temporarily offline for refurnishing",
                calendarUrl: "https://cal.com/onyx/guest-suite",
        },
];

type AmenityFormState = Pick<
        AmenityRecord,
        "name" | "property" | "category" | "status" | "location" | "capacity" | "notes" | "calendarUrl"
>;

const DEFAULT_FORM: AmenityFormState = {
        name: "",
        property: "",
        category: "",
        status: "active",
        location: "",
        capacity: 1,
        notes: "",
        calendarUrl: "",
};

export function AmenitiesPanel() {
        const [amenities, setAmenities] = useState<AmenityRecord[]>(INITIAL_AMENITIES);
        const [statusFilter, setStatusFilter] = useState<AmenityStatus | "all">("all");
        const [propertyFilter, setPropertyFilter] = useState<string>("all");
        const [searchTerm, setSearchTerm] = useState("");
        const [formState, setFormState] = useState<AmenityFormState>(DEFAULT_FORM);
        const [editingAmenity, setEditingAmenity] = useState<AmenityRecord | null>(null);
        const [dialogOpen, setDialogOpen] = useState(false);

        const properties = useMemo(
                () => Array.from(new Set(amenities.map((amenity) => amenity.property))),
                [amenities]
        );

        const filteredAmenities = useMemo(() => {
                return amenities.filter((amenity) => {
                        const matchesStatus =
                                statusFilter === "all" ? true : amenity.status === statusFilter;
                        const matchesProperty =
                                propertyFilter === "all" ? true : amenity.property === propertyFilter;
                        const matchesSearch =
                                searchTerm.length === 0
                                        ? true
                                        : `${amenity.name} ${amenity.category} ${amenity.location}`
                                                  .toLowerCase()
                                                  .includes(searchTerm.toLowerCase());

                        return matchesStatus && matchesProperty && matchesSearch;
                });
        }, [amenities, statusFilter, propertyFilter, searchTerm]);

        const openCreateDialog = () => {
                setEditingAmenity(null);
                setFormState(DEFAULT_FORM);
                setDialogOpen(true);
        };

        const openEditDialog = (amenity: AmenityRecord) => {
                setEditingAmenity(amenity);
                setFormState({
                        name: amenity.name,
                        property: amenity.property,
                        category: amenity.category,
                        status: amenity.status,
                        location: amenity.location,
                        capacity: amenity.capacity,
                        notes: amenity.notes,
                        calendarUrl: amenity.calendarUrl,
                });
                setDialogOpen(true);
        };

        const resetDialog = () => {
                setDialogOpen(false);
                setFormState(DEFAULT_FORM);
                setEditingAmenity(null);
        };

        const handleSubmit = () => {
                if (!formState.name || !formState.property) {
                        return;
                }

                if (editingAmenity) {
                        setAmenities((prev) =>
                                prev.map((amenity) =>
                                        amenity.id === editingAmenity.id
                                                ? {
                                                          ...amenity,
                                                          ...formState,
                                                          bookingsThisWeek: amenity.bookingsThisWeek,
                                                  }
                                                : amenity
                                )
                        );
                } else {
                        setAmenities((prev) => [
                                ...prev,
                                {
                                        id: createId(),
                                        bookingsThisWeek: 0,
                                        ...formState,
                                },
                        ]);
                }

                resetDialog();
        };

        const handleDelete = (id: string) => {
                setAmenities((prev) => prev.filter((amenity) => amenity.id !== id));
        };

        const exportAmenities = () => {
                exportRowsToCsv(
                        "amenities.csv",
                        filteredAmenities.map((amenity) => ({
                                name: amenity.name,
                                property: amenity.property,
                                category: amenity.category,
                                status: amenity.status,
                                location: amenity.location,
                                capacity: amenity.capacity,
                                bookings: amenity.bookingsThisWeek,
                                calendar: amenity.calendarUrl,
                        }))
                );
        };

        return (
                <Card>
                        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div>
                                        <CardTitle className="text-2xl font-semibold">Amenity operations</CardTitle>
                                        <CardDescription>
                                                Configure Cal.com availability, maintenance windows, and amenity capacity.
                                        </CardDescription>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                        <Select
                                                value={statusFilter}
                                                onValueChange={(value: AmenityStatus | "all") => setStatusFilter(value)}
                                        >
                                                <SelectTrigger className="w-[140px]">
                                                        <SelectValue placeholder="Status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                        <SelectItem value="all">All statuses</SelectItem>
                                                        {STATUS_OPTIONS.map((option) => (
                                                                <SelectItem key={option.value} value={option.value}>
                                                                        {option.label}
                                                                </SelectItem>
                                                        ))}
                                                </SelectContent>
                                        </Select>
                                        <Select value={propertyFilter} onValueChange={(value) => setPropertyFilter(value)}>
                                                <SelectTrigger className="w-[180px]">
                                                        <SelectValue placeholder="Property" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                        <SelectItem value="all">All properties</SelectItem>
                                                        {properties.map((property) => (
                                                                <SelectItem key={property} value={property}>
                                                                        {property}
                                                                </SelectItem>
                                                        ))}
                                                </SelectContent>
                                        </Select>
                                        <Input
                                                placeholder="Search amenities"
                                                value={searchTerm}
                                                onChange={(event) => setSearchTerm(event.target.value)}
                                                className="w-48"
                                        />
                                        <Button variant="outline" onClick={exportAmenities}>
                                                Export CSV
                                        </Button>
                                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                                <DialogTrigger asChild>
                                                        <Button onClick={openCreateDialog}>Add amenity</Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                        <DialogHeader>
                                                                <DialogTitle>
                                                                        {editingAmenity ? "Update amenity" : "Create amenity"}
                                                                </DialogTitle>
                                                                <DialogDescription>
                                                                        Provide scheduling metadata for the shared resource.
                                                                </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="grid gap-3 py-4">
                                                                <Label className="text-sm font-medium" htmlFor="amenity-name">
                                                                        Name
                                                                </Label>
                                                                <Input
                                                                        id="amenity-name"
                                                                        value={formState.name}
                                                                        onChange={(event) =>
                                                                                setFormState((state) => ({
                                                                                        ...state,
                                                                                        name: event.target.value,
                                                                                }))
                                                                        }
                                                                />
                                                                <Label className="text-sm font-medium" htmlFor="amenity-property">
                                                                        Property
                                                                </Label>
                                                                <Input
                                                                        id="amenity-property"
                                                                        value={formState.property}
                                                                        onChange={(event) =>
                                                                                setFormState((state) => ({
                                                                                        ...state,
                                                                                        property: event.target.value,
                                                                                }))
                                                                        }
                                                                />
                                                                <Label className="text-sm font-medium" htmlFor="amenity-category">
                                                                        Category
                                                                </Label>
                                                                <Input
                                                                        id="amenity-category"
                                                                        value={formState.category}
                                                                        onChange={(event) =>
                                                                                setFormState((state) => ({
                                                                                        ...state,
                                                                                        category: event.target.value,
                                                                                }))
                                                                        }
                                                                />
                                                                <Label className="text-sm font-medium">Status</Label>
                                                                <Select
                                                                        value={formState.status}
                                                                        onValueChange={(value: AmenityStatus) =>
                                                                                setFormState((state) => ({
                                                                                        ...state,
                                                                                        status: value,
                                                                                }))
                                                                        }
                                                                >
                                                                        <SelectTrigger>
                                                                                <SelectValue placeholder="Select status" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                                {STATUS_OPTIONS.map((option) => (
                                                                                        <SelectItem key={option.value} value={option.value}>
                                                                                                {option.label}
                                                                                        </SelectItem>
                                                                                ))}
                                                                        </SelectContent>
                                                                </Select>
                                                                <Label className="text-sm font-medium" htmlFor="amenity-location">
                                                                        Location
                                                                </Label>
                                                                <Input
                                                                        id="amenity-location"
                                                                        value={formState.location}
                                                                        onChange={(event) =>
                                                                                setFormState((state) => ({
                                                                                        ...state,
                                                                                        location: event.target.value,
                                                                                }))
                                                                        }
                                                                />
                                                                <Label className="text-sm font-medium" htmlFor="amenity-capacity">
                                                                        Capacity
                                                                </Label>
                                                                <Input
                                                                        id="amenity-capacity"
                                                                        type="number"
                                                                        min={1}
                                                                        value={formState.capacity}
                                                                        onChange={(event) =>
                                                                                setFormState((state) => ({
                                                                                        ...state,
                                                                                        capacity: Number(event.target.value),
                                                                                }))
                                                                        }
                                                                />
                                                                <Label className="text-sm font-medium" htmlFor="amenity-calendar">
                                                                        Cal.com link
                                                                </Label>
                                                                <Input
                                                                        id="amenity-calendar"
                                                                        value={formState.calendarUrl}
                                                                        onChange={(event) =>
                                                                                setFormState((state) => ({
                                                                                        ...state,
                                                                                        calendarUrl: event.target.value,
                                                                                }))
                                                                        }
                                                                />
                                                                <Label className="text-sm font-medium" htmlFor="amenity-notes">
                                                                        Notes
                                                                </Label>
                                                                <Textarea
                                                                        id="amenity-notes"
                                                                        value={formState.notes}
                                                                        onChange={(event) =>
                                                                                setFormState((state) => ({
                                                                                        ...state,
                                                                                        notes: event.target.value,
                                                                                }))
                                                                        }
                                                                />
                                                        </div>
                                                        <DialogFooter className="gap-2 sm:justify-between">
                                                                <Button variant="outline" onClick={resetDialog}>
                                                                        Cancel
                                                                </Button>
                                                                <Button onClick={handleSubmit}>
                                                                        {editingAmenity ? "Save changes" : "Create"}
                                                                </Button>
                                                        </DialogFooter>
                                                </DialogContent>
                                        </Dialog>
                                </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                        <MetricTile
                                                title="Active amenities"
                                                value={amenities.filter((amenity) => amenity.status === "active").length}
                                        />
                                        <MetricTile
                                                title="In maintenance"
                                                value={amenities.filter((amenity) => amenity.status === "maintenance").length}
                                        />
                                        <MetricTile
                                                title="Weekly bookings"
                                                value={amenities.reduce((total, amenity) => total + amenity.bookingsThisWeek, 0)}
                                        />
                                </div>
                                <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-border">
                                                <thead>
                                                        <tr className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                                                <th className="px-4 py-3">Amenity</th>
                                                                <th className="px-4 py-3">Property</th>
                                                                <th className="px-4 py-3">Status</th>
                                                                <th className="px-4 py-3">Capacity</th>
                                                                <th className="px-4 py-3">Bookings (7d)</th>
                                                                <th className="px-4 py-3">Calendar</th>
                                                                <th className="px-4 py-3">Actions</th>
                                                        </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border text-sm">
                                                        {filteredAmenities.map((amenity) => (
                                                                <tr key={amenity.id}>
                                                                        <td className="px-4 py-3">
                                                                                <div className="font-medium">{amenity.name}</div>
                                                                                <div className="text-xs text-muted-foreground">
                                                                                        {amenity.category} • {amenity.location}
                                                                                </div>
                                                                        </td>
                                                                        <td className="px-4 py-3">{amenity.property}</td>
                                                                        <td className="px-4 py-3">
                                                                                <Badge
                                                                                        variant={
                                                                                                amenity.status === "active"
                                                                                                        ? "default"
                                                                                                        : amenity.status ===
                                                                                                          "maintenance"
                                                                                                          ? "secondary"
                                                                                                          : "destructive"
                                                                                        }
                                                                                >
                                                                                        {amenity.status}
                                                                                </Badge>
                                                                        </td>
                                                                        <td className="px-4 py-3">{amenity.capacity}</td>
                                                                        <td className="px-4 py-3">{amenity.bookingsThisWeek}</td>
                                                                        <td className="px-4 py-3">
                                                                                <a
                                                                                        href={amenity.calendarUrl}
                                                                                        className="text-primary underline"
                                                                                        target="_blank"
                                                                                        rel="noreferrer"
                                                                                >
                                                                                        Cal.com link
                                                                                </a>
                                                                        </td>
                                                                        <td className="px-4 py-3">
                                                                                <div className="flex gap-2">
                                                                                        <Button
                                                                                                variant="outline"
                                                                                                size="sm"
                                                                                                onClick={() => openEditDialog(amenity)}
                                                                                        >
                                                                                                Edit
                                                                                        </Button>
                                                                                        <Button
                                                                                                variant="ghost"
                                                                                                size="sm"
                                                                                                className="text-destructive"
                                                                                                onClick={() => handleDelete(amenity.id)}
                                                                                        >
                                                                                                Delete
                                                                                        </Button>
                                                                                </div>
                                                                        </td>
                                                                </tr>
                                                        ))}
                                                </tbody>
                                        </table>
                                </div>
                        </CardContent>
                </Card>
        );
}

type MetricTileProps = {
        title: string;
        value: number;
};

function MetricTile({ title, value }: MetricTileProps) {
        return (
                <div className="rounded-lg border border-border bg-background p-4">
                        <p className="text-xs font-medium uppercase text-muted-foreground">{title}</p>
                        <p className="mt-2 text-2xl font-semibold">{value}</p>
                </div>
        );
}
