"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SustainabilityWidget = dynamic(() => import("./SustainabilityWidget"), {
        ssr: false,
        loading: () => (
                <Card>
                        <CardHeader>
                                <CardTitle>Loading sustainability insights…</CardTitle>
                        </CardHeader>
                        <CardContent>
                                <p className="text-sm text-muted-foreground">
                                        Calculating per-room energy recommendations.
                                </p>
                        </CardContent>
                </Card>
        ),
});

export function OptionalWidgetLauncher() {
        const [showWidget, setShowWidget] = useState(false);

        return (
                <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4 rounded-md border bg-background p-4">
                                <div>
                                        <p className="text-sm font-medium">Want personalised sustainability tips?</p>
                                        <p className="text-sm text-muted-foreground">
                                                We only load the simulator when you need it so regular dashboard views stay fast.
                                        </p>
                                </div>
                                <Button variant="outline" onClick={() => setShowWidget((value) => !value)}>
                                        {showWidget ? "Hide tips" : "Preview tips"}
                                </Button>
                        </div>
                        {showWidget ? <SustainabilityWidget /> : null}
                </div>
        );
}
