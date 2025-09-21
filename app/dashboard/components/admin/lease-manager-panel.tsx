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
        { label: "Draft", value: "draft" },
        { label: "Out for signature", value: "sent" },
        { label: "Active", value: "active" },
        { label: "Expired", value: "expired" },
] as const;

type LeaseStatus = (typeof STATUS_OPTIONS)[number]["value"];

type LeaseRecord = {
        id: string;
        unit: string;
        property: string;
        residents: string;
        startDate: string;
        endDate: string;
        status: LeaseStatus;
        documensoId: string;
        notes: string;
};

const INITIAL_LEASES: LeaseRecord[] = [
        {
                id: "l1",
                unit: "Unit 1A",
                property: "Onyx House - Mission",
                residents: "Amelia W., Diego R.",
                startDate: "2024-06-01",
                endDate: "2025-05-31",
                status: "active",
                documensoId: "DOC-1124",
                notes: "All roommates countersigned",
        },
        {
                id: "l2",
                unit: "Unit 2B",
                property: "Onyx House - Mission",
                residents: "Haruto S., Nia K.",
                startDate: "2023-09-01",
                endDate: "2024-08-31",
                status: "sent",
                documensoId: "DOC-2099",
                notes: "Renewal waiting on resident signature",
        },
        {
                id: "l3",
                unit: "Unit 3C",
                property: "Onyx House - Valencia",
                residents: "Lina M.",
                startDate: "2023-07-01",
                endDate: "2024-06-30",
                status: "expired",
                documensoId: "DOC-1981",
                notes: "Vacated 30 Jun",
        },
];

const createId = () =>
        typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : Math.random().toString(36).slice(2);

export function LeaseManagerPanel() {
        const [leases, setLeases] = useState<LeaseRecord[]>(INITIAL_LEASES);
        const [statusFilter, setStatusFilter] = useState<LeaseStatus | "all">("all");
        const [propertyFilter, setPropertyFilter] = useState<string>("all");
        const [dialogOpen, setDialogOpen] = useState(false);
        const [formState, setFormState] = useState<LeaseRecord>({
                id: "",
                unit: "",
                property: "",
                residents: "",
                startDate: "",
                endDate: "",
                status: "draft",
                documensoId: "",
                notes: "",
        });

        const properties = useMemo(() => Array.from(new Set(leases.map((lease) => lease.property))), [leases]);

        const filteredLeases = useMemo(() => {
                return leases.filter((lease) => {
                        const matchesStatus = statusFilter === "all" ? true : lease.status === statusFilter;
                        const matchesProperty = propertyFilter === "all" ? true : lease.property === propertyFilter;
                        return matchesStatus && matchesProperty;
                });
        }, [leases, statusFilter, propertyFilter]);

        const openCreateDialog = () => {
                setFormState({
                        id: "",
                        unit: "",
                        property: "",
                        residents: "",
                        startDate: "",
                        endDate: "",
                        status: "draft",
                        documensoId: "",
                        notes: "",
                });
                setDialogOpen(true);
        };

        const handleSubmit = () => {
                if (!formState.unit || !formState.property) {
                        return;
                }

                if (formState.id) {
                        setLeases((prev) =>
                                prev.map((lease) => (lease.id === formState.id ? { ...formState } : lease))
                        );
                } else {
                        setLeases((prev) => [...prev, { ...formState, id: createId() }]);
                }

                setDialogOpen(false);
        };

        const handleEdit = (lease: LeaseRecord) => {
                setFormState(lease);
                setDialogOpen(true);
        };

        const markStatus = (id: string, status: LeaseStatus) => {
                setLeases((prev) =>
                        prev.map((lease) => (lease.id === id ? { ...lease, status } : lease))
                );
        };

        const exportLeases = () => {
                exportRowsToCsv(
                        "leases.csv",
                        filteredLeases.map((lease) => ({
                                unit: lease.unit,
                                property: lease.property,
                                residents: lease.residents,
                                start: format(parseISO(lease.startDate), "PP"),
                                end: format(parseISO(lease.endDate), "PP"),
                                status: lease.status,
                                documenso: lease.documensoId,
                        }))
                );
        };

        const metrics = useMemo(() => {
                return {
                        active: leases.filter((lease) => lease.status === "active").length,
                        expiringSoon: leases.filter((lease) =>
                                lease.status === "sent" || lease.status === "draft"
                        ).length,
                        expired: leases.filter((lease) => lease.status === "expired").length,
                };
        }, [leases]);

        return (
                <Card>
                        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                        <CardTitle className="text-2xl font-semibold">Lease management</CardTitle>
                                        <CardDescription>
                                                Track Documenso envelopes, renewal timelines, and countersignatures.
                                        </CardDescription>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                        <Select
                                                value={statusFilter}
                                                onValueChange={(value: LeaseStatus | "all") => setStatusFilter(value)}
                                        >
                                                <SelectTrigger className="w-[150px]">
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
                                        <Button variant="outline" onClick={exportLeases}>
                                                Export CSV
                                        </Button>
                                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                                <DialogTrigger asChild>
                                                        <Button onClick={openCreateDialog}>New lease</Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                        <DialogHeader>
                                                                <DialogTitle>
                                                                        {formState.id ? "Update lease" : "Create lease"}
                                                                </DialogTitle>
                                                                <DialogDescription>
                                                                        Sync Documenso envelope metadata with Supabase.
                                                                </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="grid gap-3 py-4">
                                                                <Label htmlFor="lease-unit">Unit</Label>
                                                                <Input
                                                                        id="lease-unit"
                                                                        value={formState.unit}
                                                                        onChange={(event) =>
                                                                                setFormState((state) => ({
                                                                                        ...state,
                                                                                        unit: event.target.value,
                                                                                }))
                                                                        }
                                                                />
                                                                <Label htmlFor="lease-property">Property</Label>
                                                                <Input
                                                                        id="lease-property"
                                                                        value={formState.property}
                                                                        onChange={(event) =>
                                                                                setFormState((state) => ({
                                                                                        ...state,
                                                                                        property: event.target.value,
                                                                                }))
                                                                        }
                                                                />
                                                                <Label htmlFor="lease-residents">Residents</Label>
                                                                <Textarea
                                                                        id="lease-residents"
                                                                        value={formState.residents}
                                                                        onChange={(event) =>
                                                                                setFormState((state) => ({
                                                                                        ...state,
                                                                                        residents: event.target.value,
                                                                                }))
                                                                        }
                                                                />
                                                                <Label htmlFor="lease-start">Start date</Label>
                                                                <Input
                                                                        id="lease-start"
                                                                        type="date"
                                                                        value={formState.startDate}
                                                                        onChange={(event) =>
                                                                                setFormState((state) => ({
                                                                                        ...state,
                                                                                        startDate: event.target.value,
                                                                                }))
                                                                        }
                                                                />
                                                                <Label htmlFor="lease-end">End date</Label>
                                                                <Input
                                                                        id="lease-end"
                                                                        type="date"
                                                                        value={formState.endDate}
                                                                        onChange={(event) =>
                                                                                setFormState((state) => ({
                                                                                        ...state,
                                                                                        endDate: event.target.value,
                                                                                }))
                                                                        }
                                                                />
                                                                <Label>Status</Label>
                                                                <Select
                                                                        value={formState.status}
                                                                        onValueChange={(value: LeaseStatus) =>
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
                                                                                {STATUS_OPTIONS.map((option) => (
                                                                                        <SelectItem key={option.value} value={option.value}>
                                                                                                {option.label}
                                                                                        </SelectItem>
                                                                                ))}
                                                                        </SelectContent>
                                                                </Select>
                                                                <Label htmlFor="lease-doc">Documenso envelope ID</Label>
                                                                <Input
                                                                        id="lease-doc"
                                                                        value={formState.documensoId}
                                                                        onChange={(event) =>
                                                                                setFormState((state) => ({
                                                                                        ...state,
                                                                                        documensoId: event.target.value,
                                                                                }))
                                                                        }
                                                                />
                                                                <Label htmlFor="lease-notes">Notes</Label>
                                                                <Textarea
                                                                        id="lease-notes"
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
                                                                        {formState.id ? "Save changes" : "Create"}
                                                                </Button>
                                                        </DialogFooter>
                                                </DialogContent>
                                        </Dialog>
                                </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                        <LeaseMetric label="Active" value={metrics.active} />
                                        <LeaseMetric label="Renewals in flight" value={metrics.expiringSoon} />
                                        <LeaseMetric label="Expired" value={metrics.expired} />
                                </div>
                                <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-border text-sm">
                                                <thead>
                                                        <tr className="text-left text-xs font-medium uppercase text-muted-foreground">
                                                                <th className="px-4 py-3">Unit</th>
                                                                <th className="px-4 py-3">Residents</th>
                                                                <th className="px-4 py-3">Dates</th>
                                                                <th className="px-4 py-3">Status</th>
                                                                <th className="px-4 py-3">Documenso</th>
                                                                <th className="px-4 py-3">Actions</th>
                                                        </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                        {filteredLeases.map((lease) => (
                                                                <tr key={lease.id}>
                                                                        <td className="px-4 py-3">
                                                                                <div className="font-semibold">{lease.unit}</div>
                                                                                <div className="text-xs text-muted-foreground">{lease.property}</div>
                                                                        </td>
                                                                        <td className="px-4 py-3">{lease.residents}</td>
                                                                        <td className="px-4 py-3 text-xs text-muted-foreground">
                                                                                {format(parseISO(lease.startDate), "PP")} - {format(parseISO(lease.endDate), "PP")}
                                                                        </td>
                                                                        <td className="px-4 py-3">
                                                                                <Badge
                                                                                        variant={
                                                                                                lease.status === "active"
                                                                                                        ? "default"
                                                                                                        : lease.status === "sent"
                                                                                                        ? "secondary"
                                                                                                        : lease.status === "draft"
                                                                                                        ? "outline"
                                                                                                        : "destructive"
                                                                                        }
                                                                                >
                                                                                        {lease.status}
                                                                                </Badge>
                                                                        </td>
                                                                        <td className="px-4 py-3">{lease.documensoId}</td>
                                                                        <td className="px-4 py-3">
                                                                                <div className="flex flex-wrap gap-2">
                                                                                        <Button size="sm" variant="outline" onClick={() => handleEdit(lease)}>
                                                                                                Edit
                                                                                        </Button>
                                                                                        <Button
                                                                                                size="sm"
                                                                                                variant="secondary"
                                                                                                onClick={() => markStatus(lease.id, "sent")}
                                                                                        >
                                                                                                Send for signature
                                                                                        </Button>
                                                                                        <Button
                                                                                                size="sm"
                                                                                                variant="ghost"
                                                                                                onClick={() => markStatus(lease.id, "active")}
                                                                                        >
                                                                                                Mark active
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

type LeaseMetricProps = {
        label: string;
        value: number;
};

function LeaseMetric({ label, value }: LeaseMetricProps) {
        return (
                <div className="rounded-lg border border-border bg-background p-4 text-center">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
                        <p className="mt-2 text-xl font-semibold">{value}</p>
                </div>
        );
}
