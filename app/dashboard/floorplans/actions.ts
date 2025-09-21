"use server"

import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"

import type { Json } from "@/lib/supabase"
import type { AnnotationGeometry } from "@/types/floorplans"
import { createSupbaseServerClient } from "@/utils/supaone"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

import {
  assertCanManageFloorplan,
  type FloorplanAccessContext,
  type FloorplanScope,
  isTenantRole,
} from "@/lib/floorplans/access"
import {
  createAnnotation as createAnnotationService,
  deleteAnnotation as deleteAnnotationService,
  updateAnnotation as updateAnnotationService,
  type CreateAnnotationInput,
  type FloorplanSummary,
  type UpdateAnnotationInput,
} from "@/lib/floorplans/service"

interface ProfileRow {
  id: string
  role: string | null
  full_name: string | null
}

const FLOORPLAN_PATH = "/dashboard/floorplans"

function sanitiseFileName(original: string) {
  const trimmed = original.trim()
  const dotIndex = trimmed.lastIndexOf(".")
  const base = dotIndex > 0 ? trimmed.slice(0, dotIndex) : trimmed
  const extension = dotIndex > 0 ? trimmed.slice(dotIndex) : ""
  const safeBase = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")

  const safeExtension = extension.toLowerCase().replace(/[^.a-z0-9]/g, "")
  return `${safeBase || "floorplan"}${safeExtension}`
}

async function getSessionProfile(client: TypedSupabaseClient) {
  const {
    data: { session },
    error: sessionError,
  } = await client.auth.getSession()

  if (sessionError) {
    throw new Error(sessionError.message)
  }

  if (!session?.user) {
    throw new Error("Not authenticated")
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", session.user.id)
    .single()

  if (profileError || !profile) {
    throw new Error(profileError?.message ?? "Profile not found")
  }

  return { session, profile: profile as ProfileRow }
}

async function getManagedBuildingIds(client: TypedSupabaseClient, userId: string, role: string | null) {
  if (role !== "property_manager") {
    return []
  }

  const { data, error } = await client
    .from("building_managers")
    .select("building_id")
    .eq("manager_id", userId)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map(row => row.building_id)
}

async function getAssignedUnitIds(client: TypedSupabaseClient, userId: string, role: string | null) {
  if (!isTenantRole(role)) {
    return []
  }

  const { data, error } = await client
    .from("unit_assignments")
    .select("unit_id")
    .eq("tenant_id", userId)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map(row => row.unit_id)
}

async function buildAccessContext(client: TypedSupabaseClient) {
  const { session, profile } = await getSessionProfile(client)
  const [managedBuildingIds, unitIds] = await Promise.all([
    getManagedBuildingIds(client, session.user.id, profile.role),
    getAssignedUnitIds(client, session.user.id, profile.role),
  ])

  return {
    context: {
      userId: session.user.id,
      role: profile.role,
      managedBuildingIds,
      unitIds,
    } satisfies FloorplanAccessContext,
    profile,
  }
}

async function fetchFloorplanSummary(client: TypedSupabaseClient, floorplanId: string) {
  const { data, error } = await client
    .from("floorplans")
    .select("id, building_id, unit_id")
    .eq("id", floorplanId)
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Floorplan not found")
  }

  return {
    id: data.id,
    buildingId: data.building_id,
    unitId: data.unit_id,
  } satisfies FloorplanSummary
}

export interface CreateFloorplanInput {
  buildingId: string
  unitId: string
  name: string
  fileName: string
  contentType?: string | null
  width?: number | null
  height?: number | null
  metadata?: Json
}

export async function createFloorplanRecord(input: CreateFloorplanInput) {
  if (!input.fileName) {
    throw new Error("File name is required")
  }

  const client = await createSupbaseServerClient()
  const { context, profile } = await buildAccessContext(client)

  const scope: FloorplanScope = {
    buildingId: input.buildingId,
    unitId: input.unitId,
  }

  assertCanManageFloorplan(context, scope)

  const floorplanId = randomUUID()
  const safeFileName = sanitiseFileName(input.fileName)
  const assetPath = `${floorplanId}/${safeFileName}`
  const metadata = (input.metadata ?? {}) as Json

  const { data, error } = await client
    .from("floorplans")
    .insert({
      id: floorplanId,
      building_id: input.buildingId,
      unit_id: input.unitId,
      name: input.name,
      asset_path: assetPath,
      content_type: input.contentType ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      metadata,
      uploaded_by: profile.id,
    })
    .select("id, asset_path, building_id, unit_id, name, content_type, width, height")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create floorplan")
  }

  revalidatePath(FLOORPLAN_PATH)

  return {
    ...data,
    asset_path: data.asset_path,
    id: data.id,
  }
}

export interface MarkUploadCompleteInput {
  floorplanId: string
  contentType?: string | null
  width?: number | null
  height?: number | null
}

export async function markFloorplanUploadComplete(input: MarkUploadCompleteInput) {
  const client = await createSupbaseServerClient()
  const { context } = await buildAccessContext(client)
  const floorplan = await fetchFloorplanSummary(client, input.floorplanId)

  assertCanManageFloorplan(context, {
    buildingId: floorplan.buildingId,
    unitId: floorplan.unitId,
  })

  const updates: Record<string, Json> = {}
  if (input.contentType !== undefined) {
    updates.content_type = input.contentType ?? null
  }
  if (input.width !== undefined) {
    updates.width = input.width ?? null
  }
  if (input.height !== undefined) {
    updates.height = input.height ?? null
  }
  updates.updated_at = new Date().toISOString()

  if (Object.keys(updates).length === 0) {
    return
  }

  const { error } = await client
    .from("floorplans")
    .update(updates)
    .eq("id", input.floorplanId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(FLOORPLAN_PATH)
}

export interface CreateAnnotationActionInput {
  floorplanId: string
  label: string
  annotationType: string
  geometry: AnnotationGeometry
  color?: string | null
  notes?: string | null
  assignedProfileId?: string | null
}

export async function createAnnotationAction(input: CreateAnnotationActionInput) {
  const client = await createSupbaseServerClient()
  const { context } = await buildAccessContext(client)
  const floorplanRow = await fetchFloorplanSummary(client, input.floorplanId)

  const payload: CreateAnnotationInput = {
    label: input.label,
    annotationType: input.annotationType,
    geometry: input.geometry,
    color: input.color ?? null,
    notes: input.notes ?? null,
    assignedProfileId: input.assignedProfileId ?? null,
  }

  const result = await createAnnotationService(client, context, floorplanRow, payload)
  revalidatePath(FLOORPLAN_PATH)
  return result
}

export interface UpdateAnnotationActionInput {
  annotationId: string
  floorplanId: string
  label?: string
  annotationType?: string
  geometry?: AnnotationGeometry
  color?: string | null
  notes?: string | null
  assignedProfileId?: string | null
}

export async function updateAnnotationAction(input: UpdateAnnotationActionInput) {
  const client = await createSupbaseServerClient()
  const { context } = await buildAccessContext(client)
  const floorplanRow = await fetchFloorplanSummary(client, input.floorplanId)

  const payload: UpdateAnnotationInput = {
    label: input.label,
    annotationType: input.annotationType,
    geometry: input.geometry,
    color: input.color ?? null,
    notes: input.notes ?? null,
    assignedProfileId: input.assignedProfileId ?? null,
  }

  const result = await updateAnnotationService(
    client,
    context,
    floorplanRow,
    input.annotationId,
    payload,
  )
  revalidatePath(FLOORPLAN_PATH)
  return result
}

export async function deleteAnnotationAction(annotationId: string, floorplanId: string) {
  const client = await createSupbaseServerClient()
  const { context } = await buildAccessContext(client)
  const floorplanRow = await fetchFloorplanSummary(client, floorplanId)

  await deleteAnnotationService(client, context, floorplanRow, annotationId)
  revalidatePath(FLOORPLAN_PATH)
}
