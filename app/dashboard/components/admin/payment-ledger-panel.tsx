"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
        Select,
        SelectContent,
        SelectItem,
        SelectTrigger,
        SelectValue,
} from "@/components/ui/select";
import { exportRowsToCsv } from "./export-utils";

type PaymentStatus = "paid" | "late" | "failed" | "upcoming";

type PaymentRecord = {
        id: string;
        resident: string;
        unit: string;
        property: string;
        amount: number;
        status: PaymentStatus;
        dueDate: string;
        paidDate?: string;
        invoiceId: string;
};

const LEDGER: PaymentRecord[] = [
        {
                id: "p1",
                resident: "Amelia W.",
                unit: "Unit 1A",
                property: "Onyx House - Mission",
                amount: 1425,
                status: "paid",
                dueDate: "2024-07-01",
                paidDate: "2024-07-01",
                invoiceId: "INV-4091",
        },
        {
                id: "p2",
                resident: "Diego R.",
                unit: "Unit 1A",
                property: "Onyx House - Mission",
                amount: 1425,
                status: "late",
                dueDate: "2024-07-01",
                paidDate: undefined,
                invoiceId: "INV-4092",
        },
        {
                id: "p3",
                resident: "Haruto S.",
                unit: "Unit 2B",
                property: "Onyx House - Mission",
                amount: 1580,
                status: "paid",
                dueDate: "2024-07-01",
                paidDate: "2024-07-02",
                invoiceId: "INV-4093",
        },
        {
                id: "p4",
                resident: "Nia K.",
                unit: "Unit 2B",
                property: "Onyx House - Mission",
                amount: 1580,
                status: "failed",
                dueDate: "2024-07-01",
                invoiceId: "INV-4094",
        },
        {
                id: "p5",
                resident: "Lina M.",
                unit: "Unit 3C",
                property: "Onyx House - Valencia",
                amount: 1360,
                status: "upcoming",
                dueDate: "2024-08-01",
                invoiceId: "INV-4095",
        },
];

const STATUS_BADGE: Record<PaymentStatus, "default" | "secondary" | "destructive" | "outline"> = {
        paid: "default",
        late: "secondary",
        failed: "destructive",
        upcoming: "outline",
};

export function PaymentLedgerPanel() {
        const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
        const [propertyFilter, setPropertyFilter] = useState<string>("all");
        const [search, setSearch] = useState("");

        const properties = useMemo(() => Array.from(new Set(LEDGER.map((payment) => payment.property))), []);

        const filteredLedger = useMemo(() => {
                return LEDGER.filter((payment) => {
                        const matchesStatus = statusFilter === "all" ? true : payment.status === statusFilter;
                        const matchesProperty = propertyFilter === "all" ? true : payment.property === propertyFilter;
                        const matchesSearch =
                                search.length === 0
                                        ? true
                                        : `${payment.resident} ${payment.invoiceId}`
                                                  .toLowerCase()
                                                  .includes(search.toLowerCase());
                        return matchesStatus && matchesProperty && matchesSearch;
                });
        }, [statusFilter, propertyFilter, search]);

        const metrics = useMemo(() => {
                const collected = LEDGER.filter((payment) => payment.status === "paid").reduce(
                        (total, payment) => total + payment.amount,
                        0
                );
                const overdue = LEDGER.filter((payment) => payment.status === "late" || payment.status === "failed").reduce(
                        (total, payment) => total + payment.amount,
                        0
                );
                const upcoming = LEDGER.filter((payment) => payment.status === "upcoming").reduce(
                        (total, payment) => total + payment.amount,
                        0
                );
                return { collected, overdue, upcoming };
        }, []);

        const exportLedger = () => {
                exportRowsToCsv(
                        "rent-ledger.csv",
                        filteredLedger.map((payment) => ({
                                resident: payment.resident,
                                unit: payment.unit,
                                property: payment.property,
                                amount: payment.amount,
                                status: payment.status,
                                due: format(parseISO(payment.dueDate), "PP"),
                                paid: payment.paidDate ? format(parseISO(payment.paidDate), "PP") : "",
                                invoice: payment.invoiceId,
                        }))
                );
        };

        return (
                <Card>
                        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                        <CardTitle className="text-2xl font-semibold">Rent ledger</CardTitle>
                                        <CardDescription>
                                                Reconcile Stripe payouts, overdue balances, and upcoming charges.
                                        </CardDescription>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                        <Select value={statusFilter} onValueChange={(value: PaymentStatus | "all") => setStatusFilter(value)}>
                                                <SelectTrigger className="w-[140px]">
                                                        <SelectValue placeholder="Status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                        <SelectItem value="all">All statuses</SelectItem>
                                                        <SelectItem value="paid">Paid</SelectItem>
                                                        <SelectItem value="late">Late</SelectItem>
                                                        <SelectItem value="failed">Failed</SelectItem>
                                                        <SelectItem value="upcoming">Upcoming</SelectItem>
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
                                        <Input
                                                placeholder="Search resident or invoice"
                                                className="w-56"
                                                value={search}
                                                onChange={(event) => setSearch(event.target.value)}
                                        />
                                        <Button variant="outline" onClick={exportLedger}>
                                                Export CSV
                                        </Button>
                                </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                        <LedgerMetric label="Collected" value={metrics.collected} />
                                        <LedgerMetric label="Overdue" value={metrics.overdue} />
                                        <LedgerMetric label="Upcoming" value={metrics.upcoming} />
                                </div>
                                <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-border text-sm">
                                                <thead>
                                                        <tr className="text-left text-xs font-medium uppercase text-muted-foreground">
                                                                <th className="px-4 py-3">Resident</th>
                                                                <th className="px-4 py-3">Unit</th>
                                                                <th className="px-4 py-3">Amount</th>
                                                                <th className="px-4 py-3">Due date</th>
                                                                <th className="px-4 py-3">Status</th>
                                                                <th className="px-4 py-3">Invoice</th>
                                                        </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                        {filteredLedger.map((payment) => (
                                                                <tr key={payment.id}>
                                                                        <td className="px-4 py-3">
                                                                                <div className="font-semibold">{payment.resident}</div>
                                                                                <div className="text-xs text-muted-foreground">{payment.property}</div>
                                                                        </td>
                                                                        <td className="px-4 py-3">{payment.unit}</td>
                                                                        <td className="px-4 py-3">${payment.amount.toLocaleString()}</td>
                                                                        <td className="px-4 py-3 text-xs text-muted-foreground">
                                                                                {format(parseISO(payment.dueDate), "PP")}
                                                                                {payment.paidDate ? ` • Paid ${format(parseISO(payment.paidDate), "PP")}` : ""}
                                                                        </td>
                                                                        <td className="px-4 py-3">
                                                                                <Badge variant={STATUS_BADGE[payment.status]}>{payment.status}</Badge>
                                                                        </td>
                                                                        <td className="px-4 py-3">{payment.invoiceId}</td>
                                                                </tr>
                                                        ))}
                                                </tbody>
                                        </table>
                                        {filteredLedger.length === 0 ? (
                                                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                                                        No payments matched your filters.
                                                </div>
                                        ) : null}
                                </div>
                        </CardContent>
                </Card>
        );
}

type LedgerMetricProps = {
        label: string;
        value: number;
};

function LedgerMetric({ label, value }: LedgerMetricProps) {
        const formatter = new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 0,
        });

        return (
                <div className="rounded-lg border border-border bg-background p-4 text-center">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
                        <p className="mt-2 text-xl font-semibold">{formatter.format(value)}</p>
                </div>
        );
}
