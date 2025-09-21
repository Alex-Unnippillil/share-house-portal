"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

type VisitorStatus = "pending" | "approved" | "denied";

type VisitorRequest = {
        id: string;
        host: string;
        guest: string;
        arrival: string;
        departure: string;
        status: VisitorStatus;
        nights: number;
        property: string;
        reason: string;
        notes: string;
};

const INITIAL_VISITORS: VisitorRequest[] = [
        {
                id: "v1",
                host: "Amelia W.",
                guest: "Jamie",
                arrival: "2024-07-12",
                departure: "2024-07-14",
                status: "pending",
                nights: 2,
                property: "Onyx House - Mission",
                reason: "Family visit",
                notes: "Requires parking pass",
        },
        {
                id: "v2",
                host: "Diego R.",
                guest: "Valentina",
                arrival: "2024-07-15",
                departure: "2024-07-16",
                status: "approved",
                nights: 1,
                property: "Onyx House - Mission",
                reason: "Partner visit",
                notes: "Approved by policy",
        },
        {
                id: "v3",
                host: "Haruto S.",
                guest: "Yuki",
                arrival: "2024-07-11",
                departure: "2024-07-12",
                status: "denied",
                nights: 1,
                property: "Onyx House - Valencia",
                reason: "Extended stay request",
                notes: "Exceeded consecutive nights policy",
        },
        {
                id: "v4",
                host: "Nia K.",
                guest: "Tessa",
                arrival: "2024-07-18",
                departure: "2024-07-20",
                status: "pending",
                nights: 2,
                property: "Onyx House - Valencia",
                reason: "Friend visiting",
                notes: "Needs accessibility support",
        },
];

export function VisitorApprovalsPanel() {
        const [requests, setRequests] = useState<VisitorRequest[]>(INITIAL_VISITORS);
        const [statusFilter, setStatusFilter] = useState<VisitorStatus | "all">("all");
        const [propertyFilter, setPropertyFilter] = useState<string>("all");
        const [search, setSearch] = useState("");
        const [policyNote, setPolicyNote] = useState<string>("");

        const properties = useMemo(
                () => Array.from(new Set(requests.map((request) => request.property))),
                [requests]
        );

        const filteredRequests = useMemo(() => {
                return requests.filter((request) => {
                        const matchesStatus =
                                statusFilter === "all" ? true : request.status === statusFilter;
                        const matchesProperty =
                                propertyFilter === "all" ? true : request.property === propertyFilter;
                        const matchesSearch =
                                search.length === 0
                                        ? true
                                        : `${request.host} ${request.guest}`
                                                  .toLowerCase()
                                                  .includes(search.toLowerCase());
                        return matchesStatus && matchesProperty && matchesSearch;
                });
        }, [requests, statusFilter, propertyFilter, search]);

        const updateStatus = (id: string, status: VisitorStatus) => {
                setRequests((prev) =>
                        prev.map((request) =>
                                request.id === id
                                        ? {
                                                  ...request,
                                                  status,
                                                  notes: policyNote ? `${policyNote}` : request.notes,
                                          }
                                        : request
                        )
                );
                setPolicyNote("");
        };

        const exportRequests = () => {
                exportRowsToCsv(
                        "visitor-requests.csv",
                        filteredRequests.map((request) => ({
                                host: request.host,
                                guest: request.guest,
                                arrival: format(parseISO(request.arrival), "PP"),
                                departure: format(parseISO(request.departure), "PP"),
                                nights: request.nights,
                                status: request.status,
                                property: request.property,
                        }))
                );
        };

        const metrics = useMemo(() => {
                return {
                        pending: requests.filter((request) => request.status === "pending").length,
                        approvedNights: requests
                                .filter((request) => request.status === "approved")
                                .reduce((total, request) => total + request.nights, 0),
                        denied: requests.filter((request) => request.status === "denied").length,
                };
        }, [requests]);

        return (
                <Card>
                        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                        <CardTitle className="text-2xl font-semibold">Overnight visitors</CardTitle>
                                        <CardDescription>
                                                Approve guest stays and ensure policy compliance across houses.
                                        </CardDescription>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                        <Select
                                                value={statusFilter}
                                                onValueChange={(value: VisitorStatus | "all") => setStatusFilter(value)}
                                        >
                                                <SelectTrigger className="w-[140px]">
                                                        <SelectValue placeholder="Status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                        <SelectItem value="all">All statuses</SelectItem>
                                                        <SelectItem value="pending">Pending</SelectItem>
                                                        <SelectItem value="approved">Approved</SelectItem>
                                                        <SelectItem value="denied">Denied</SelectItem>
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
                                                placeholder="Search host or guest"
                                                className="w-56"
                                                value={search}
                                                onChange={(event) => setSearch(event.target.value)}
                                        />
                                        <Button variant="outline" onClick={exportRequests}>
                                                Export CSV
                                        </Button>
                                </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                        <VisitorMetric label="Pending approvals" value={metrics.pending} />
                                        <VisitorMetric label="Approved nights" value={metrics.approvedNights} />
                                        <VisitorMetric label="Denied" value={metrics.denied} />
                                </div>
                                <div className="rounded-lg border border-border bg-muted/20 p-4">
                                        <Label className="text-xs font-semibold uppercase text-muted-foreground" htmlFor="policy-note">
                                                Policy note
                                        </Label>
                                        <Textarea
                                                id="policy-note"
                                                placeholder="Add an optional note that will be stored with the approval or denial."
                                                value={policyNote}
                                                onChange={(event) => setPolicyNote(event.target.value)}
                                                className="mt-2"
                                        />
                                </div>
                                <div className="space-y-3">
                                        {filteredRequests.map((request) => (
                                                <div
                                                        key={request.id}
                                                        className="rounded-lg border border-border bg-background p-4 shadow-sm"
                                                >
                                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                                                <div>
                                                                        <p className="text-sm font-semibold">
                                                                                {request.guest} staying with {request.host}
                                                                        </p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                                {format(parseISO(request.arrival), "PP")} -
                                                                                {" "}
                                                                                {format(parseISO(request.departure), "PP")} • {request.nights} nights
                                                                        </p>
                                                                </div>
                                                                <Badge
                                                                        variant={
                                                                                request.status === "approved"
                                                                                        ? "default"
                                                                                        : request.status === "pending"
                                                                                        ? "secondary"
                                                                                        : "destructive"
                                                                        }
                                                                >
                                                                        {request.status}
                                                                </Badge>
                                                        </div>
                                                        <div className="mt-2 text-xs text-muted-foreground">
                                                                <p>{request.reason}</p>
                                                                <p>Property: {request.property}</p>
                                                                <p className="mt-1">Notes: {request.notes}</p>
                                                        </div>
                                                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                                                <Button size="sm" variant="outline" onClick={() => updateStatus(request.id, "approved")}>
                                                                        Approve &amp; notify
                                                                </Button>
                                                                <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="text-destructive"
                                                                        onClick={() => updateStatus(request.id, "denied")}
                                                                >
                                                                        Deny request
                                                                </Button>
                                                        </div>
                                                </div>
                                        ))}
                                        {filteredRequests.length === 0 ? (
                                                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                                                        No visitor requests matched your filters.
                                                </div>
                                        ) : null}
                                </div>
                        </CardContent>
                </Card>
        );
}

type VisitorMetricProps = {
        label: string;
        value: number;
};

function VisitorMetric({ label, value }: VisitorMetricProps) {
        return (
                <div className="rounded-lg border border-border bg-background p-4 text-center">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
                        <p className="mt-2 text-xl font-semibold">{value}</p>
                </div>
        );
}
