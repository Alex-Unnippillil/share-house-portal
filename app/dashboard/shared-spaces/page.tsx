import { redirect } from "next/navigation"

import { getSharedSpaceMapsForAdmin } from "./actions"
import { CreateDiagramForm } from "./components/create-form"
import { DiagramManagerList } from "./components/diagram-manager"

export const dynamic = "force-dynamic"

export default async function SharedSpacesAdminPage() {
  try {
    const diagrams = await getSharedSpaceMapsForAdmin()

    return (
      <div className="space-y-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Shared space diagrams</h1>
          <p className="max-w-2xl text-muted-foreground">
            Upload, annotate, and manage shared area diagrams for each lease. Tenants will see signed URLs and
            label overlays generated from the metadata defined here.
          </p>
        </header>
        <CreateDiagramForm />
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Published diagrams</h2>
          <DiagramManagerList diagrams={diagrams} />
        </section>
      </div>
    )
  } catch (error) {
    console.error("Unable to load shared space maps", error)
    redirect("/dashboard")
  }
}
