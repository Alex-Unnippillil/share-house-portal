"use client";

import { useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AppRole } from "@/config/rbac";
import { ROLE_LABELS } from "@/config/rbac";

const METRIC_WINDOWS = [
        { label: "This month", value: "month" },
        { label: "Quarter to date", value: "quarter" },
        { label: "Year to date", value: "year" },
] as const;

type WindowKey = (typeof METRIC_WINDOWS)[number]["value"];

type Metric = {
        title: string;
        value: string;
        change: string;
        description: string;
};

const METRIC_LIBRARY: Record<WindowKey, Metric[]> = {
        month: [
                {
                        title: "Rent collected",
                        value: "$38,420",
                        change: "+4.6% vs last month",
                        description: "Stripe payouts reconciled across 5 units.",
                },
                {
                        title: "Upcoming renewals",
                        value: "3 leases",
                        change: "30 day window",
                        description: "Documenso packets awaiting resident signatures.",
                },
                {
                        title: "Amenity utilisation",
                        value: "82%",
                        change: "+12% vs policy target",
                        description: "Kitchen, parking and media room occupancy.",
                },
                {
                        title: "Visitor approvals",
                        value: "14 approved",
                        change: "3 pending",
                        description: "Guests processed through overnight policy workflow.",
                },
        ],
        quarter: [
                {
                        title: "Portfolio occupancy",
                        value: "96%",
                        change: "+2% vs previous quarter",
                        description: "Active leases across all Onyx properties.",
                },
                {
                        title: "Maintenance resolution",
                        value: "36 tickets",
                        change: "Median 18h to close",
                        description: "Tracked through amenity downtime windows.",
                },
                {
                        title: "Stripe recovery",
                        value: "$4,120",
                        change: "7 failed payments retried",
                        description: "Auto-retries triggered via billing portal.",
                },
                {
                        title: "Cal.com sync health",
                        value: "100%",
                        change: "No webhook failures",
                        description: "Realtime booking replication into Supabase.",
                },
        ],
        year: [
                {
                        title: "Annual revenue",
                        value: "$421,870",
                        change: "+11.3% vs LY",
                        description: "Recognised rent plus amenity upsell packages.",
                },
                {
                        title: "Portfolio expansion",
                        value: "12 houses",
                        change: "+3 properties",
                        description: "New markets onboarded into platform admin scope.",
                },
                {
                        title: "Lease compliance",
                        value: "98%",
                        change: "All Documenso packets countersigned",
                        description: "Audit trail with per-tenant access logging.",
                },
                {
                        title: "Amenity investments",
                        value: "$32k",
                        change: "CapEx matched to budget",
                        description: "Upgrades funded for top-booked amenities.",
                },
        ],
};

type AdminMetricsProps = {
        role: AppRole;
};

export function AdminMetrics({ role }: AdminMetricsProps) {
        const [window, setWindow] = useState<WindowKey>("month");

        const metrics = useMemo(() => METRIC_LIBRARY[window], [window]);

        return (
                <Card>
                        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div>
                                        <CardTitle className="text-2xl font-semibold">
                                                {ROLE_LABELS[role]} metrics overview
                                        </CardTitle>
                                        <CardDescription>
                                                Compare rent, bookings, and compliance signals across your managed units.
                                        </CardDescription>
                                </div>
                                <Select value={window} onValueChange={(value: WindowKey) => setWindow(value)}>
                                        <SelectTrigger className="w-48">
                                                <SelectValue placeholder="Select window" />
                                        </SelectTrigger>
                                        <SelectContent>
                                                {METRIC_WINDOWS.map((item) => (
                                                        <SelectItem key={item.value} value={item.value}>
                                                                {item.label}
                                                        </SelectItem>
                                                ))}
                                        </SelectContent>
                                </Select>
                        </CardHeader>
                        <CardContent>
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        {metrics.map((metric) => (
                                                <div
                                                        key={`${window}-${metric.title}`}
                                                        className="rounded-lg border border-border bg-muted/30 p-4"
                                                >
                                                        <p className="text-xs font-medium uppercase text-muted-foreground">
                                                                {metric.title}
                                                        </p>
                                                        <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
                                                        <p className="text-xs font-semibold text-primary">{metric.change}</p>
                                                        <p className="mt-3 text-xs text-muted-foreground">
                                                                {metric.description}
                                                        </p>
                                                </div>
                                        ))}
                                </div>
                        </CardContent>
                </Card>
        );
}
