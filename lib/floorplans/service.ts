import type { Json } from "@/lib/supabase"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

import type { AnnotationGeometry } from "@/types/floorplans"
import {
  assertCanManageFloorplan,
  type FloorplanAccessContext,
  type FloorplanScope,
} from "./access"

export interface FloorplanSummary extends FloorplanScope {
  id: string
}

export interface CreateAnnotationInput {
  label: string
  annotationType: string
  geometry: AnnotationGeometry
  color?: string | null
  notes?: string | null
  assignedProfileId?: string | null
}

export interface UpdateAnnotationInput {
  label?: string
  annotationType?: string
  geometry?: AnnotationGeometry
  color?: string | null
  notes?: string | null
  assignedProfileId?: string | null
}

const clampPercentage = (value: number | null | undefined) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined
  }
  return Math.min(100, Math.max(0, value))
}

export const sanitiseGeometry = (geometry: AnnotationGeometry) => {
  const next: Record<string, Json> = {}
  for (const [key, value] of Object.entries(geometry)) {
    if (key === "x" || key === "y" || key === "width" || key === "height" || key === "rotation") {
      const numericValue = clampPercentage(typeof value === "number" ? value : Number(value))
      if (numericValue !== undefined) {
        next[key] = numericValue
      }
      continue
    }
    next[key] = value as Json
  }
  return next as AnnotationGeometry
}

const buildAnnotationPayload = (
  input: CreateAnnotationInput | UpdateAnnotationInput,
) => {
  const geometry = input.geometry ? sanitiseGeometry(input.geometry) : undefined
  return {
    ...(input.label ? { label: input.label } : {}),
    ...(input.annotationType ? { annotation_type: input.annotationType } : {}),
    ...(geometry ? { geometry: geometry as Json } : {}),
    ...(input.color !== undefined ? { color: input.color ?? null } : {}),
    ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
    ...(input.assignedProfileId !== undefined
      ? { assigned_profile_id: input.assignedProfileId ?? null }
      : {}),
  } satisfies Record<string, Json>
}

export async function createAnnotation(
  client: TypedSupabaseClient,
  context: FloorplanAccessContext,
  floorplan: FloorplanSummary,
  input: CreateAnnotationInput,
) {
  assertCanManageFloorplan(context, floorplan)

  const payload = buildAnnotationPayload(input)
  payload.floorplan_id = floorplan.id
  payload.created_by = context.userId
  const { data, error } = await client
    .from("floorplan_annotations")
    .insert(payload)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function updateAnnotation(
  client: TypedSupabaseClient,
  context: FloorplanAccessContext,
  floorplan: FloorplanSummary,
  annotationId: string,
  input: UpdateAnnotationInput,
) {
  assertCanManageFloorplan(context, floorplan)
  const payload = buildAnnotationPayload(input)
  payload.updated_at = new Date().toISOString()
  const { data, error } = await client
    .from("floorplan_annotations")
    .update(payload)
    .eq("id", annotationId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function deleteAnnotation(
  client: TypedSupabaseClient,
  context: FloorplanAccessContext,
  floorplan: FloorplanSummary,
  annotationId: string,
) {
  assertCanManageFloorplan(context, floorplan)
  const { error } = await client
    .from("floorplan_annotations")
    .delete()
    .eq("id", annotationId)

  if (error) {
    throw new Error(error.message)
  }
}
