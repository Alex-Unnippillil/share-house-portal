import { redirect } from "next/navigation"

import { readUserSession } from "@/utils/actions"

import { getTenantSharedSpaceMaps } from "./actions"
import { groupSharedSpaceMapsByLease } from "@/lib/shared-space-maps"
import { DiagramGrid } from "./components/diagram-grid"

export const dynamic = "force-dynamic"

export default async function SharedSpacesPage() {
  const { data } = await readUserSession()

  if (!data.session) {
    redirect("/auth")
  }

  const diagrams = await getTenantSharedSpaceMaps()
  const grouped = groupSharedSpaceMapsByLease(diagrams)

  return (
    <div className="container mx-auto space-y-10 py-10">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Shared community areas</p>
        <h1 className="text-3xl font-bold tracking-tight">Shared space diagrams</h1>
        <p className="max-w-2xl text-muted-foreground">
          Review updated floor plans, amenity guides, and shared area diagrams that are specific to your lease
          and unit. Use the interactive overlays to locate rooms, resources, and safety information before your
          next visit.
        </p>
      </header>
      <DiagramGrid groups={grouped} />
    </div>
  )
}
