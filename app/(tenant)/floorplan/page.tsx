import type { Tables } from "@/lib/supabase"
import { parseFloorplanOverlays } from "@/lib/floorplans"
import { createSupbaseServerClient } from "@/utils/supaone"

import { FloorplanClient } from "./floorplan-client"

type FloorplanRow = Tables<"floorplans">

type FloorplanWithPresentation = FloorplanRow & {
  publicUrl: string | null
  overlaysParsed: ReturnType<typeof parseFloorplanOverlays>
}

interface FloorplanPageProps {
  searchParams?: {
    household?: string
  }
}

export const dynamic = "force-dynamic"

export default async function FloorplanPage({ searchParams }: FloorplanPageProps) {
  const supabase = await createSupbaseServerClient()

  let query = supabase
    .from("floorplans")
    .select("*")
    .order("created_at", { ascending: false })

  const householdFilter = searchParams?.household?.trim()
  if (householdFilter) {
    query = query.eq("household_id", householdFilter)
  }

  const { data, error } = await query

  if (error) {
    console.error("Failed to load floorplans", error)
  }

  const floorplans: FloorplanWithPresentation[] = (data ?? []).map((row) => {
    const { data: publicUrlData } = supabase.storage.from("floorplans").getPublicUrl(row.storage_path)

    return {
      ...row,
      publicUrl: publicUrlData?.publicUrl ?? null,
      overlaysParsed: parseFloorplanOverlays(row.overlays),
    }
  })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8">
      <FloorplanClient floorplans={floorplans} />
    </div>
  )
}
