import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/server"
import type { FloorplanMetadata } from "@/types/floorplans"

import FloorplanViewer from "./floorplan-viewer"
import PlanDetails from "./plan-details"
import PlanSwitcher from "./plan-switcher"

type FloorplansPageProps = {
  searchParams?: {
    plan?: string
  }
}

type LoadResult = {
  plans: FloorplanMetadata[]
  error?: string
}

async function loadFloorplans(bucket: string): Promise<LoadResult> {
  try {
    const supabase = createClient()
    const { data: files, error } = await supabase.storage.from(bucket).list("metadata", {
      limit: 50,
      sortBy: { column: "name", order: "asc" },
    })

    if (error) {
      return { plans: [], error: error.message }
    }

    const jsonFiles = (files ?? []).filter((file) => file.name?.endsWith(".json"))

    const plans = (
      await Promise.all(
        jsonFiles.map(async (file) => {
          const { data, error: downloadError } = await supabase.storage
            .from(bucket)
            .download(`metadata/${file.name}`)

          if (downloadError || !data) {
            console.error("Failed to download floorplan metadata", downloadError)
            return null
          }

          const buffer = Buffer.from(await data.arrayBuffer())
          try {
            const parsed = JSON.parse(buffer.toString("utf-8")) as FloorplanMetadata
            return parsed
          } catch (parseError) {
            console.error("Failed to parse floorplan metadata", parseError)
            return null
          }
        })
      )
    ).filter((value): value is FloorplanMetadata => value !== null)

    return { plans }
  } catch (error) {
    console.error("Failed to load floorplans", error)
    return { plans: [], error: error instanceof Error ? error.message : "Unknown error" }
  }
}

function createStoragePublicUrl(bucket: string, supabaseUrl?: string) {
  if (!supabaseUrl) {
    return null
  }

  const normalizedUrl = supabaseUrl.replace(/\/$/, "")
  return `${normalizedUrl}/storage/v1/object/public/${bucket}`
}

export default async function FloorplansPage({ searchParams }: FloorplansPageProps) {
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_FLOORPLAN_BUCKET ?? "floorplans"
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  const { plans, error } = await loadFloorplans(bucket)

  const storageBaseUrl = createStoragePublicUrl(bucket, supabaseUrl)

  if (plans.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Floorplans</h1>
          <p className="text-muted-foreground">
            Floorplan tiles will appear here once they are generated and uploaded.
          </p>
        </div>
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {error
              ? `We couldn\'t load any floorplans: ${error}`
              : "No floorplans are available yet."}
          </p>
        </div>
      </div>
    )
  }

  const sortedPlans = [...plans].sort((a, b) => a.name.localeCompare(b.name))
  const requestedPlanId = searchParams?.plan
  const selectedPlan = sortedPlans.find((plan) => plan.planId === requestedPlanId) ?? sortedPlans[0]

  const planOptions = sortedPlans.map((plan) => ({ id: plan.planId, label: plan.name }))
  const tileBaseUrl = storageBaseUrl ? `${storageBaseUrl}/tiles/${selectedPlan.planId}` : null
  const metadataUrl = storageBaseUrl
    ? `${storageBaseUrl}/metadata/${selectedPlan.planId}.json`
    : "#"

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Floorplans</h1>
          <p className="text-muted-foreground">
            Explore per-unit layouts with pinch-zoom, panning, and tile-based rendering.
          </p>
        </div>
        <PlanSwitcher plans={planOptions} selectedPlanId={selectedPlan.planId} />
      </div>
      {!storageBaseUrl && (
        <div className="rounded-lg border border-amber-300 bg-amber-100/60 p-4 text-sm text-amber-900">
          Configure <code>NEXT_PUBLIC_SUPABASE_URL</code> so the viewer can resolve public storage URLs for floorplan tiles.
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-h-[520px]">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-2xl font-semibold">
              {selectedPlan.name}
              <Badge variant="outline" className="text-xs font-normal">
                {selectedPlan.levels.length} zoom levels
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {selectedPlan.width} × {selectedPlan.height}px canvas using {selectedPlan.tileSize}px tiles.
            </p>
          </CardHeader>
          <CardContent className="h-[640px] p-0">
            {tileBaseUrl ? (
              <FloorplanViewer metadata={selectedPlan} tileBaseUrl={tileBaseUrl} />
            ) : (
              <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                Floorplan tiles cannot be displayed until public storage URLs are configured.
              </div>
            )}
          </CardContent>
        </Card>
        <PlanDetails metadata={selectedPlan} metadataUrl={metadataUrl} />
      </div>
    </div>
  )
}
