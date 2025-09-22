"use client";

import { useMemo } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const BASE_USAGE = {
        kitchen: 42,
        livingRoom: 30,
        bedrooms: 24,
};

const TIPS = {
        kitchen: "Run the dishwasher when full and switch to eco mode to save 15% energy.",
        livingRoom: "Unplug consoles overnight and dim smart bulbs after midnight.",
        bedrooms: "Open windows for airflow before using fans to cool down rooms.",
};

export default function SustainabilityWidget() {
        const totals = useMemo(() => {
                const sum = Object.values(BASE_USAGE).reduce((acc, value) => acc + value, 0);
                return {
                        sum,
                        breakdown: Object.entries(BASE_USAGE).map(([zone, value]) => ({
                                zone,
                                value,
                                percent: Math.round((value / sum) * 100),
                        })),
                };
        }, []);

        return (
                <Card>
                        <CardHeader>
                                <CardTitle>Energy usage simulator</CardTitle>
                                <CardDescription>
                                        Snapshot of last week’s consumption with quick wins per shared space.
                                </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        {totals.breakdown.map((item) => (
                                                <div key={item.zone} className="rounded-md border p-3">
                                                        <dt className="text-sm font-medium capitalize">{item.zone}</dt>
                                                        <dd className="text-2xl font-semibold">{item.value} kWh</dd>
                                                        <dd className="text-xs text-muted-foreground">{item.percent}% of household total</dd>
                                                </div>
                                        ))}
                                </dl>
                                <div className="space-y-3">
                                        {totals.breakdown.map((item) => (
                                                <div key={item.zone} className="rounded-md border bg-muted/40 p-3">
                                                        <p className="text-sm font-medium capitalize">{item.zone}</p>
                                                        <p className="text-xs text-muted-foreground">{TIPS[item.zone as keyof typeof TIPS]}</p>
                                                </div>
                                        ))}
                                </div>
                        </CardContent>
                </Card>
        );
}
