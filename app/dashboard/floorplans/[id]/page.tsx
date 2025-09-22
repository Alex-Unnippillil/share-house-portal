import { notFound } from "next/navigation"

import { FloorplanOverlayEditor } from "@/components/floorplans/floorplan-overlay-editor"
import { FloorplanOverlayViewer } from "@/components/floorplans/floorplan-overlay-viewer"
import { parseNormalizedPolygon } from "@/lib/floorplan-geometry"
import type { Floorplan, OverlayShape } from "@/types/floorplans"
import { createSupbaseServerClient } from "@/utils/supaone"

import {
  deleteOverlayShapeAction,
  saveOverlayShapeAction,
} from "../actions"

type FloorplanPageProps = {
  params: {
    id: string
  }
}

export default async function FloorplanDetailPage({ params }: FloorplanPageProps) {
  const floorplanId = params.id
  const supabase = await createSupbaseServerClient()

  const { data: floorplanRow, error: floorplanError } = await supabase
    .from("floorplans")
    .select("id, name, image_url, description, created_at")
    .eq("id", floorplanId)
    .maybeSingle()

  if (floorplanError || !floorplanRow) {
    return notFound()
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("id, role, full_name, email")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null }

  const { data: overlayRows } = await supabase
    .from("overlay_shapes")
    .select("id, label, type, polygon, tenant_id, floorplan_id, created_at")
    .eq("floorplan_id", floorplanId)
    .order("created_at", { ascending: true })

  const overlays: OverlayShape[] = (overlayRows ?? []).map((row) => ({
    id: row.id,
    floorplanId: row.floorplan_id,
    label: row.label,
    type: row.type,
    polygon: parseNormalizedPolygon(row.polygon),
    tenantId: row.tenant_id,
    createdAt: row.created_at,
  }))

  const floorplan: Floorplan = {
    id: floorplanRow.id,
    name: floorplanRow.name,
    imageUrl: floorplanRow.image_url,
    description: floorplanRow.description,
    createdAt: floorplanRow.created_at,
  }

  const isAdmin = profile?.role === "admin"

  const tenantOptions = isAdmin
    ? ((await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name", { ascending: true })).data ?? [])
        .map((tenant) => ({
          id: tenant.id,
          label: tenant.full_name ?? tenant.email ?? "Unnamed tenant",
        }))
    : []

  if (isAdmin) {
    return (
      <FloorplanOverlayEditor
        floorplan={floorplan}
        overlays={overlays}
        tenants={tenantOptions}
        onSave={saveOverlayShapeAction}
        onDelete={deleteOverlayShapeAction}
      />
    )
  }

  return (
    <FloorplanOverlayViewer
      floorplan={floorplan}
      overlays={overlays}
      tenantId={profile?.id ?? null}
    />
  )
}
