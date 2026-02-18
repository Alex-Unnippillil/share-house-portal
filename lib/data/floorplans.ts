import "server-only"

import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

import type { FloorplanAnnotation, FloorplanMarkerType, FloorplanVisibilityScope } from "@/lib/floorplan-permissions"

type UploadFloorplanInput = {
  propertyId: string
  unitId: string
  fileName: string
  svgContent: string
  uploadedBy: string
}

type FloorplanRecord = {
  id: string
  propertyId: string | null
  unitId: string | null
  storagePath: string
  originalFileName: string | null
  currentVersion: number
  uploadedBy: string | null
  uploadedAt: string
}

type SaveAnnotationInput = {
  floorplanId: string
  markerType: FloorplanMarkerType
  label: string
  note?: string | null
  x: number
  y: number
  visibilityScope: FloorplanVisibilityScope
  visibleToUserIds?: string[]
  createdBy: string
}

const FLOORPLAN_BUCKET = "floorplans"

function sanitizeFileName(fileName: string) {
  return fileName.toLowerCase().replace(/[^a-z0-9.-]/g, "-")
}

function toFloorplanRecord(row: any): FloorplanRecord {
  return {
    id: row.id,
    propertyId: row.property_id,
    unitId: row.unit_id,
    storagePath: row.storage_path,
    originalFileName: row.original_file_name,
    currentVersion: row.current_version,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
  }
}

export async function uploadFloorplanSvg(
  supabase: TypedSupabaseClient,
  input: UploadFloorplanInput,
): Promise<FloorplanRecord> {
  const safeFileName = sanitizeFileName(input.fileName)
  const storagePath = `${input.propertyId}/${input.unitId}/${Date.now()}-${safeFileName}`

  const { error: storageError } = await supabase.storage
    .from(FLOORPLAN_BUCKET)
    .upload(storagePath, input.svgContent, {
      contentType: "image/svg+xml",
      upsert: true,
    })

  if (storageError) {
    throw new Error(`Unable to upload floorplan SVG: ${storageError.message}`)
  }

  const { data: existingFloorplan } = await supabase
    .from("floorplans")
    .select("id,current_version")
    .eq("property_id", input.propertyId)
    .eq("unit_id", input.unitId)
    .maybeSingle()

  const payload = {
    property_id: input.propertyId,
    unit_id: input.unitId,
    storage_path: storagePath,
    original_file_name: input.fileName,
    uploaded_by: input.uploadedBy,
    current_version: (existingFloorplan?.current_version ?? 0) + 1,
    uploaded_at: new Date().toISOString(),
  }

  const query = existingFloorplan
    ? supabase.from("floorplans").update(payload).eq("id", existingFloorplan.id)
    : supabase.from("floorplans").insert(payload)

  const { data, error } = await query.select("*").single()

  if (error || !data) {
    throw new Error(`Unable to save floorplan metadata: ${error?.message ?? "Unknown error"}`)
  }

  return toFloorplanRecord(data)
}

export async function getFloorplanByUnit(
  supabase: TypedSupabaseClient,
  propertyId: string,
  unitId: string,
): Promise<FloorplanRecord | null> {
  const { data, error } = await supabase
    .from("floorplans")
    .select("*")
    .eq("property_id", propertyId)
    .eq("unit_id", unitId)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Unable to load floorplan: ${error.message}`)
  }

  if (!data) {
    return null
  }

  return toFloorplanRecord(data)
}

export async function getFloorplanSvg(
  supabase: TypedSupabaseClient,
  storagePath: string,
): Promise<string> {
  const { data, error } = await supabase.storage.from(FLOORPLAN_BUCKET).download(storagePath)

  if (error || !data) {
    throw new Error(`Unable to download floorplan SVG: ${error?.message ?? "Unknown error"}`)
  }

  return data.text()
}

export async function createFloorplanAnnotation(
  supabase: TypedSupabaseClient,
  input: SaveAnnotationInput,
): Promise<FloorplanAnnotation> {
  const { data, error } = await supabase
    .from("floorplan_annotations")
    .insert({
      floorplan_id: input.floorplanId,
      marker_type: input.markerType,
      label: input.label,
      note: input.note ?? null,
      x_position: input.x,
      y_position: input.y,
      visibility_scope: input.visibilityScope,
      visible_to_user_ids: input.visibleToUserIds ?? [],
      created_by: input.createdBy,
      updated_by: input.createdBy,
    })
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(`Unable to create annotation: ${error?.message ?? "Unknown error"}`)
  }

  return {
    id: data.id,
    markerType: data.marker_type,
    label: data.label,
    note: data.note,
    x: data.x_position,
    y: data.y_position,
    createdBy: data.created_by,
    visibleToUserIds: data.visible_to_user_ids ?? [],
    visibilityScope: data.visibility_scope,
    version: data.version,
    updatedAt: data.updated_at,
  }
}
