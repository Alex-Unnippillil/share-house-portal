"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";

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
import { Textarea } from "@/components/ui/textarea";
import {
        Select,
        SelectContent,
        SelectItem,
        SelectTrigger,
        SelectValue,
} from "@/components/ui/select";
import { exportRowsToCsv } from "./export-utils";

type FloorplanStatus = "published" | "draft";

type FloorplanRecord = {
        id: string;
        unit: string;
        property: string;
        status: FloorplanStatus;
        overlays: number;
        updatedAt: string;
        notes: string;
};

const INITIAL_FLOORPLANS: FloorplanRecord[] = [
        {
                id: "fp1",
                unit: "Unit 1A",
                property: "Onyx House - Mission",
                status: "published",
                overlays: 4,
                updatedAt: "2024-06-20",
                notes: "Includes storage assignments and cleaning routes.",
        },
        {
                id: "fp2",
                unit: "Unit 2B",
                property: "Onyx House - Mission",
                status: "draft",
                overlays: 2,
                updatedAt: "2024-07-08",
                notes: "Awaiting roommate approval for closet allocations.",
        },
        {
                id: "fp3",
                unit: "Unit 3C",
                property: "Onyx House - Valencia",
                status: "published",
                overlays: 3,
                updatedAt: "2024-06-15",
                notes: "Appliance maintenance zones updated.",
        },
];

const createId = () =>
        typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : Math.random().toString(36).slice(2);

export function FloorplansPanel() {
        const [floorplans, setFloorplans] = useState<FloorplanRecord[]>(INITIAL_FLOORPLANS);
        const [statusFilter, setStatusFilter] = useState<FloorplanStatus | "all">("all");
        const [propertyFilter, setPropertyFilter] = useState<string>("all");
        const [dialogOpen, setDialogOpen] = useState(false);
        const [editing, setEditing] = useState<FloorplanRecord | null>(null);
        const [formState, setFormState] = useState<Omit<FloorplanRecord, "id">>({
                unit: "",
                property: "",
                status: "published",
                overlays: 0,
                updatedAt: new Date().toISOString().slice(0, 10),
                notes: "",
        });

        const properties = useMemo(
                () => Array.from(new Set(floorplans.map((floorplan) => floorplan.property))),
                [floorplans]
        );

        const filteredFloorplans = useMemo(() => {
                return floorplans.filter((floorplan) => {
                        const matchesStatus = statusFilter === "all" ? true : floorplan.status === statusFilter;
                        const matchesProperty = propertyFilter === "all" ? true : floorplan.property === propertyFilter;
                        return matchesStatus && matchesProperty;
                });
        }, [floorplans, statusFilter, propertyFilter]);

        const openCreateDialog = () => {
                setEditing(null);
                setFormState({
                        unit: "",
                        property: "",
                        status: "published",
                        overlays: 0,
                        updatedAt: new Date().toISOString().slice(0, 10),
                        notes: "",
                });
                setDialogOpen(true);
        };

        const openEditDialog = (floorplan: FloorplanRecord) => {
                setEditing(floorplan);
                setFormState({
                        unit: floorplan.unit,
                        property: floorplan.property,
                        status: floorplan.status,
                        overlays: floorplan.overlays,
                        updatedAt: floorplan.updatedAt,
                        notes: floorplan.notes,
                });
                setDialogOpen(true);
        };

        const handleSubmit = () => {
                if (!formState.unit || !formState.property) {
                        return;
                }

                if (editing) {
                        setFloorplans((prev) =>
                                prev.map((floorplan) =>
                                        floorplan.id === editing.id
                                                ? {
                                                          ...editing,
                                                          ...formState,
                                                  }
                                                : floorplan
                                )
                        );
                } else {
                        setFloorplans((prev) => [
                                ...prev,
                                {
                                        id: createId(),
                                        ...formState,
                                },
                        ]);
                }

                setDialogOpen(false);
        };

        const exportFloorplans = () => {
                exportRowsToCsv(
                        "floorplans.csv",
                        filteredFloorplans.map((floorplan) => ({
                                unit: floorplan.unit,
                                property: floorplan.property,
                                overlays: floorplan.overlays,
                                status: floorplan.status,
                                updated: format(parseISO(floorplan.updatedAt), "PP"),
                        }))
                );
        };

        const metrics = useMemo(() => {
                return {
                        published: floorplans.filter((floorplan) => floorplan.status === "published").length,
                        drafts: floorplans.filter((floorplan) => floorplan.status === "draft").length,
                        overlays: floorplans.reduce((total, floorplan) => total + floorplan.overlays, 0),
                };
        }, [floorplans]);

        return (
                <Card>
                        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                        <CardTitle className="text-2xl font-semibold">Floorplans & overlays</CardTitle>
                                        <CardDescription>
                                                Manage SVG overlays and roommate annotations for every unit.
                                        </CardDescription>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                        <Select
                                                value={statusFilter}
                                                onValueChange={(value: FloorplanStatus | "all") => setStatusFilter(value)}
                                        >
                                                <SelectTrigger className="w-[150px]">
                                                        <SelectValue placeholder="Status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                        <SelectItem value="all">All statuses</SelectItem>
                                                        <SelectItem value="published">Published</SelectItem>
                                                        <SelectItem value="draft">Draft</SelectItem>
                                                </SelectContent>
                                        </Select>
                                        <Select value={propertyFilter} onValueChange={(value) => setPropertyFilter(value)}>
                                                <SelectTrigger className="w-[200px]">
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
                                        <Button variant="outline" onClick={exportFloorplans}>
                                                Export CSV
                                        </Button>
                                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                                <DialogTrigger asChild>
                                                        <Button onClick={openCreateDialog}>Upload overlay</Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                        <DialogHeader>
                                                                <DialogTitle>
                                                                        {editing ? "Update floorplan" : "Add floorplan"}
                                                                </DialogTitle>
                                                                <DialogDescription>
                                                                        Track annotated SVG overlays and metadata per unit.
                                                                </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="grid gap-3 py-4">
                                                                <Label htmlFor="floorplan-unit">Unit</Label>
                                                                <Input
                                                                        id="floorplan-unit"
                                                                        value={formState.unit}
                                                                        onChange={(event) =>
                                                                                setFormState((state) => ({
                                                                                        ...state,
                                                                                        unit: event.target.value,
                                                                                }))
                                                                        }
                                                                />
                                                                <Label htmlFor="floorplan-property">Property</Label>
                                                                <Input
                                                                        id="floorplan-property"
                                                                        value={formState.property}
                                                                        onChange={(event) =>
                                                                                setFormState((state) => ({
                                                                                        ...state,
                                                                                        property: event.target.value,
                                                                                }))
                                                                        }
                                                                />
                                                                <Label>Status</Label>
                                                                <Select
                                                                        value={formState.status}
                                                                        onValueChange={(value: FloorplanStatus) =>
                                                                                setFormState((state) => ({
                                                                                        ...state,
                                                                                        status: value,
                                                                                }))
                                                                        }
                                                                >
                                                                        <SelectTrigger>
                                                                                <SelectValue placeholder="Status" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                                <SelectItem value="published">Published</SelectItem>
                                                                                <SelectItem value="draft">Draft</SelectItem>
                                                                        </SelectContent>
                                                                </Select>
                                                                <Label htmlFor="floorplan-overlays">Overlay count</Label>
                                                                <Input
                                                                        id="floorplan-overlays"
                                                                        type="number"
                                                                        min={0}
                                                                        value={formState.overlays}
                                                                        onChange={(event) =>
                                                                                setFormState((state) => ({
                                                                                        ...state,
                                                                                        overlays: Number(event.target.value),
                                                                                }))
                                                                        }
                                                                />
                                                                <Label htmlFor="floorplan-updated">Last updated</Label>
                                                                <Input
                                                                        id="floorplan-updated"
                                                                        type="date"
                                                                        value={formState.updatedAt}
                                                                        onChange={(event) =>
                                                                                setFormState((state) => ({
                                                                                        ...state,
                                                                                        updatedAt: event.target.value,
                                                                                }))
                                                                        }
                                                                />
                                                                <Label htmlFor="floorplan-notes">Notes</Label>
                                                                <Textarea
                                                                        id="floorplan-notes"
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
                                                                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                                                        Cancel
                                                                </Button>
                                                                <Button onClick={handleSubmit}>
                                                                        {editing ? "Save changes" : "Create"}
                                                                </Button>
                                                        </DialogFooter>
                                                </DialogContent>
                                        </Dialog>
                                </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-3">
                                        <FloorplanMetric label="Published" value={metrics.published} />
                                        <FloorplanMetric label="Draft" value={metrics.drafts} />
                                        <FloorplanMetric label="Total overlays" value={metrics.overlays} />
                                </div>
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                        {filteredFloorplans.map((floorplan) => (
                                                <div
                                                        key={floorplan.id}
                                                        className="flex flex-col justify-between rounded-lg border border-border bg-background p-4"
                                                >
                                                        <div className="space-y-3">
                                                                <div className="flex items-center justify-between">
                                                                        <div>
                                                                                <p className="text-sm font-semibold">{floorplan.unit}</p>
                                                                                <p className="text-xs text-muted-foreground">{floorplan.property}</p>
                                                                        </div>
                                                                        <Badge variant={floorplan.status === "published" ? "default" : "secondary"}>
                                                                                {floorplan.status}
                                                                        </Badge>
                                                                </div>
                                                                <div className="h-32 rounded-md border border-dashed bg-muted/30" aria-hidden="true">
                                                                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                                                                Floorplan preview
                                                                        </div>
                                                                </div>
                                                                <p className="text-xs text-muted-foreground">{floorplan.notes}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                        {floorplan.overlays} overlays • Updated {format(parseISO(floorplan.updatedAt), "PP")}
                                                                </p>
                                                        </div>
                                                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                                                <Button size="sm" variant="outline" onClick={() => openEditDialog(floorplan)}>
                                                                        Edit overlay notes
                                                                </Button>
                                                                <Button size="sm" variant="ghost">
                                                                        Share with residents
                                                                </Button>
                                                        </div>
                                                </div>
                                        ))}
                                        {filteredFloorplans.length === 0 ? (
                                                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                                                        No floorplans match your filters.
                                                </div>
                                        ) : null}
                                </div>
                        </CardContent>
                </Card>
        );
}

type FloorplanMetricProps = {
        label: string;
        value: number;
};

function FloorplanMetric({ label, value }: FloorplanMetricProps) {
        return (
                <div className="rounded-lg border border-border bg-background p-4 text-center">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
                        <p className="mt-2 text-xl font-semibold">{value}</p>
                </div>
        );
}
