"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

import type { BuildingAnalytics } from "../lib/data-sources"

type BuildingAnalyticsChartProps = {
  analytics: BuildingAnalytics
}

export function BuildingAnalyticsChart({ analytics }: BuildingAnalyticsChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Building analytics</CardTitle>
        <CardDescription>Monthly rent performance with amenity and maintenance trends.</CardDescription>
      </CardHeader>
      <CardContent className={cn("grid gap-6", "lg:grid-cols-3")}>
        <div className="h-[320px] lg:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.rentCollectionByMonth}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="collected" name="Collected" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outstanding" name="Outstanding" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-4">
          <section>
            <h4 className="text-sm font-semibold">Bookings by amenity</h4>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {analytics.amenityBookingsByAmenity.map((entry) => (
                <li key={entry.amenity} className="flex items-center justify-between">
                  <span>{entry.amenity}</span>
                  <span className="font-medium text-foreground">{entry.count}</span>
                </li>
              ))}
              {analytics.amenityBookingsByAmenity.length === 0 ? (
                <li className="text-muted-foreground">No bookings recorded.</li>
              ) : null}
            </ul>
          </section>
          <section>
            <h4 className="text-sm font-semibold">Open tickets by priority</h4>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {Object.entries(analytics.maintenanceByPriority).map(([priority, count]) => (
                <li key={priority} className="flex items-center justify-between capitalize">
                  <span>{priority}</span>
                  <span className="font-medium text-foreground">{count}</span>
                </li>
              ))}
              {Object.keys(analytics.maintenanceByPriority).length === 0 ? (
                <li className="text-muted-foreground">No open maintenance tickets.</li>
              ) : null}
            </ul>
          </section>
        </div>
      </CardContent>
    </Card>
  )
}
