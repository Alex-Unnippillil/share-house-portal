"use client";

import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { VisitorBookingForm } from "./visitor-booking-form";
import { VisitorHistory } from "./visitor-history";
import { VisitorPolicyCard } from "./visitor-policy-card";

const visitorHighlights = [
  {
    title: "Easy Guest Registration",
    description:
      "Register overnight visitors with all necessary details and get approval from roommates.",
  },
  {
    title: "Automatic Notifications",
    description:
      "Roommates and property managers are automatically notified of new visitor requests.",
  },
];

export function VisitorExperience() {
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Register New Visitor</CardTitle>
            <CardDescription>
              Fill out the form to register an overnight guest. All roommates will be notified automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VisitorBookingForm onBookingCreated={() => setHistoryRefreshKey((key) => key + 1)} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <VisitorPolicyCard />
        <VisitorHistory refreshKey={historyRefreshKey} />
        <div className="grid gap-6">
          {visitorHighlights.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
