import type { Metadata } from "next"

import { AmenityForm } from "./_components/amenity-form"

export const metadata: Metadata = {
  title: "Amenity configuration",
  description:
    "Define availability, buffers, and capacity rules for shared amenities before exposing them to residents.",
}

export default function AmenitiesPage() {
  return (
    <section className="container mx-auto max-w-5xl space-y-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Amenity configuration</h1>
        <p className="text-muted-foreground">
          Manage booking windows and throughput for each shared space so reservations stay fair and predictable.
        </p>
      </div>
      <AmenityForm />
    </section>
  )
}
