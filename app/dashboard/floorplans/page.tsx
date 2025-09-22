import { Metadata } from "next"

import FloorplanOverlays from "@/components/floorplan/floorplan-overlays"

export const metadata: Metadata = {
  title: "Floorplan overlays",
  description:
    "Interactive roommate assignments mapped to the shared floorplan with accessible overlays and saved viewing preferences.",
}

export default function FloorplanDashboardPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Floorplan overlays</h1>
        <p className="max-w-2xl text-muted-foreground">
          Review storage assignments, cleaning rotations, maintenance tasks, and guest policies directly on the digital floorplan.
          Adjust the zoom and pan to your liking—your preferences are stored for the next visit.
        </p>
      </header>
      <FloorplanOverlays />
    </div>
  )
}
