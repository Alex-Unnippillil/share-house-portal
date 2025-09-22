import Image from "next/image"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { parseFloorplanOverlays, type FloorplanOverlay } from "@/lib/floorplans"
import type { Tables } from "@/lib/supabase"
import { createSupbaseServerClient } from "@/utils/supaone"
import { FloorplanUploadForm } from "./floorplan-upload-form"

type Household = Pick<Tables<"households">, "id" | "name" | "slug">

type FloorplanRecord = Tables<"floorplans">

type FloorplanWithPresentation = FloorplanRecord & {
  publicUrl: string | null
  overlaysParsed: FloorplanOverlay[]
}

export const dynamic = "force-dynamic"

export default async function FloorplansPage() {
  const supabase = await createSupbaseServerClient()

  const { data: householdData, error: householdsError } = await supabase
    .from("households")
    .select("id, name, slug")
    .order("name", { ascending: true })

  if (householdsError) {
    console.error("Failed to load households", householdsError)
  }

  const households: Household[] = householdData ?? []

  const { data: floorplanData, error: floorplansError } = await supabase
    .from("floorplans")
    .select("*")
    .order("created_at", { ascending: false })

  if (floorplansError) {
    console.error("Failed to load floorplans", floorplansError)
  }

  const floorplans: FloorplanWithPresentation[] = (floorplanData ?? []).map((floorplan) => {
    const { data: publicUrlData } = supabase.storage.from("floorplans").getPublicUrl(floorplan.storage_path)

    return {
      ...floorplan,
      publicUrl: publicUrlData?.publicUrl ?? null,
      overlaysParsed: parseFloorplanOverlays(floorplan.overlays),
    }
  })

  return (
    <div className="space-y-10">
      <FloorplanUploadForm households={households} />
      <ExistingFloorplans floorplans={floorplans} />
    </div>
  )
}

function ExistingFloorplans({ floorplans }: { floorplans: FloorplanWithPresentation[] }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Existing floorplans</h2>
        <p className="text-sm text-muted-foreground">
          Review uploaded floorplans, overlay counts, and quick links to the tenant view.
        </p>
      </div>

      {floorplans.length === 0 ? (
        <p className="rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 p-6 text-center text-sm text-muted-foreground">
          No floorplans have been uploaded yet.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {floorplans.map((floorplan) => {
            const overlayCount = floorplan.overlaysParsed.length
            const tenantHref = floorplan.household_id
              ? `/floorplan?household=${encodeURIComponent(floorplan.household_id)}`
              : "/floorplan"

            return (
              <article
                key={floorplan.id}
                className="flex h-full flex-col overflow-hidden rounded-lg border bg-card shadow-sm"
              >
                {floorplan.publicUrl ? (
                  <div className="relative h-48 w-full bg-muted">
                    <Image
                      src={floorplan.publicUrl}
                      alt={`Preview of ${floorplan.name}`}
                      fill
                      sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover"
                      priority={false}
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center bg-muted text-sm text-muted-foreground">
                    Preview unavailable
                  </div>
                )}

                <div className="flex flex-1 flex-col gap-4 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold leading-tight">{floorplan.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {floorplan.created_at
                          ? new Date(floorplan.created_at).toLocaleString()
                          : "Creation date unavailable"}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {floorplan.width}×{floorplan.height}px
                    </Badge>
                  </div>

                  {floorplan.description ? (
                    <p className="text-sm text-muted-foreground">{floorplan.description}</p>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">No description provided.</p>
                  )}

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Household:</span> {floorplan.household_id ?? "—"}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Overlays:</span> {overlayCount}
                    </p>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-3 text-xs">
                    <Badge variant="outline">
                      {overlayCount === 1 ? "1 overlay" : `${overlayCount} overlays`}
                    </Badge>
                    <Link
                      href={tenantHref}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      View tenant preview
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
