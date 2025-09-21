"use server"

import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { canManageBuilding, canManageFloorplan } from "@/lib/floorplans/access"
import { createSupbaseServerClient } from "@/utils/supaone"

export type ActionState = {
  status: "idle" | "success" | "error"
  message?: string
}

export const initialActionState: ActionState = { status: "idle" }

const floorplanSchema = z.object({
  buildingId: z.string().uuid(),
  unitId: z.string().uuid().nullable(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
})

const annotationSchema = z.object({
  annotationId: z.string().uuid().optional(),
  floorplanId: z.string().uuid(),
  label: z.string().min(1).max(160),
  annotationType: z.enum(["storage", "chore", "note", "other"]),
  profileId: z.string().uuid().nullable(),
  geometry: z.any(),
  metadata: z.any().optional(),
})

const createErrorState = (message: string): ActionState => ({ status: "error", message })

const successState = (message: string): ActionState => ({ status: "success", message })

const ensureFileIsValid = (value: FormDataEntryValue | null): File | null => {
  if (!(value instanceof File)) {
    return null
  }

  if (value.size === 0) {
    return null
  }

  return value
}

const parseJsonField = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined
  }

  try {
    return JSON.parse(value)
  } catch (error) {
    return undefined
  }
}

async function getProfileAndAssignments(supabase: Awaited<ReturnType<typeof createSupbaseServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in to manage floorplans." }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return { error: "Unable to load your profile." }
  }

  let managedBuildingIds: string[] = []

  if (profile.role === "property_manager") {
    const { data: assignments, error: assignmentsError } = await supabase
      .from("property_manager_buildings")
      .select("building_id")
      .eq("manager_id", profile.id)

    if (assignmentsError) {
      return { error: "Unable to load your building assignments." }
    }

    managedBuildingIds = (assignments ?? []).map((assignment) => assignment.building_id)
  }

  return { profile, managedBuildingIds }
}

export async function createFloorplan(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createSupbaseServerClient()
  const context = await getProfileAndAssignments(supabase)

  if ("error" in context) {
    return createErrorState(context.error)
  }

  const buildingIdInput = formData.get("buildingId")
  const unitIdInput = formData.get("unitId")
  const nameInput = formData.get("name")
  const descriptionInput = formData.get("description")
  const file = ensureFileIsValid(formData.get("file"))

  if (!file) {
    return createErrorState("A floorplan image or SVG file is required.")
  }

  const normalizedUnitId = typeof unitIdInput === "string" && unitIdInput.length > 0 ? unitIdInput : null

  const parsed = floorplanSchema.safeParse({
    buildingId: typeof buildingIdInput === "string" ? buildingIdInput : undefined,
    unitId: normalizedUnitId,
    name: typeof nameInput === "string" ? nameInput : undefined,
    description: typeof descriptionInput === "string" ? descriptionInput : undefined,
  })

  if (!parsed.success) {
    return createErrorState(parsed.error.errors[0]?.message ?? "Invalid floorplan details.")
  }

  const { profile, managedBuildingIds } = context

  if (!canManageBuilding(profile.role, parsed.data.buildingId, managedBuildingIds)) {
    return createErrorState("You do not have permission to manage this building.")
  }

  const allowedTypes = new Set(["image/png", "image/jpeg", "image/svg+xml", "image/webp"])

  const contentType = file.type || "application/octet-stream"

  if (file.type && !allowedTypes.has(file.type)) {
    return createErrorState("Unsupported file type. Please upload an SVG or image file.")
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const extension = (() => {
    const originalName = file.name || ""
    const parts = originalName.split(".")
    const suffix = parts.length > 1 ? parts.pop() ?? "" : ""

    if (/^[a-z0-9]+$/i.test(suffix)) {
      return `.${suffix.toLowerCase()}`
    }

    switch (contentType) {
      case "image/png":
        return ".png"
      case "image/jpeg":
        return ".jpg"
      case "image/webp":
        return ".webp"
      case "image/svg+xml":
        return ".svg"
      default:
        return ""
    }
  })()

  const storagePath = `${profile.id}/${randomUUID()}${extension}`

  const { error: uploadError } = await supabase.storage
    .from("floorplans")
    .upload(storagePath, buffer, {
      cacheControl: "3600",
      upsert: true,
      contentType,
    })

  if (uploadError) {
    return createErrorState("Unable to upload the floorplan asset. Please try again.")
  }

  const { error: insertError } = await supabase.from("floorplans").insert({
    building_id: parsed.data.buildingId,
    unit_id: parsed.data.unitId,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    storage_path: storagePath,
    media_type: contentType,
    created_by: profile.id,
  })

  if (insertError) {
    await supabase.storage.from("floorplans").remove([storagePath])
    return createErrorState("Unable to save the floorplan record. Please try again.")
  }

  revalidatePath("/dashboard/floorplans")

  return successState("Floorplan uploaded successfully.")
}

export async function deleteFloorplan(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createSupbaseServerClient()
  const context = await getProfileAndAssignments(supabase)

  if ("error" in context) {
    return createErrorState(context.error)
  }

  const floorplanIdValue = formData.get("floorplanId")

  if (typeof floorplanIdValue !== "string") {
    return createErrorState("A floorplan identifier is required.")
  }

  const { data: floorplan, error: floorplanError } = await supabase
    .from("floorplans")
    .select("id, building_id, storage_path")
    .eq("id", floorplanIdValue)
    .maybeSingle()

  if (floorplanError || !floorplan) {
    return createErrorState("The requested floorplan could not be found.")
  }

  const { profile, managedBuildingIds } = context

  if (!canManageFloorplan(profile.role, floorplan, managedBuildingIds)) {
    return createErrorState("You are not allowed to delete this floorplan.")
  }

  const { error: deleteError } = await supabase
    .from("floorplans")
    .delete()
    .eq("id", floorplan.id)

  if (deleteError) {
    return createErrorState("Unable to delete the floorplan. Please try again.")
  }

  if (floorplan.storage_path) {
    await supabase.storage.from("floorplans").remove([floorplan.storage_path])
  }

  revalidatePath("/dashboard/floorplans")

  return successState("Floorplan deleted.")
}

const parseAnnotationForm = (formData: FormData, requireAnnotationId = false) => {
  const annotationIdValue = formData.get("annotationId")
  const floorplanIdValue = formData.get("floorplanId")
  const labelValue = formData.get("label")
  const annotationTypeValue = formData.get("annotationType")
  const profileIdValue = formData.get("profileId")

  const geometryValue = parseJsonField(formData.get("geometry"))
  const metadataValue = parseJsonField(formData.get("metadata"))

  const normalizedProfileId =
    typeof profileIdValue === "string" && profileIdValue.length > 0 && profileIdValue !== "unassigned"
      ? profileIdValue
      : null

  const parsed = annotationSchema.safeParse({
    annotationId:
      requireAnnotationId && typeof annotationIdValue === "string" ? annotationIdValue : undefined,
    floorplanId: typeof floorplanIdValue === "string" ? floorplanIdValue : undefined,
    label: typeof labelValue === "string" ? labelValue : undefined,
    annotationType: typeof annotationTypeValue === "string" ? annotationTypeValue : undefined,
    profileId: normalizedProfileId,
    geometry: geometryValue,
    metadata: metadataValue,
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid annotation details." }
  }

  return { data: parsed.data }
}

export async function createAnnotation(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createSupbaseServerClient()
  const context = await getProfileAndAssignments(supabase)

  if ("error" in context) {
    return createErrorState(context.error)
  }

  const parsed = parseAnnotationForm(formData)

  if ("error" in parsed) {
    return createErrorState(parsed.error)
  }

  const { data } = parsed

  if (data.geometry == null || typeof data.geometry !== "object") {
    return createErrorState("Geometry must be valid JSON.")
  }

  const { data: floorplan, error: floorplanError } = await supabase
    .from("floorplans")
    .select("id, building_id")
    .eq("id", data.floorplanId)
    .maybeSingle()

  if (floorplanError || !floorplan) {
    return createErrorState("Unable to locate the referenced floorplan.")
  }

  const { profile, managedBuildingIds } = context

  if (!canManageFloorplan(profile.role, floorplan, managedBuildingIds)) {
    return createErrorState("You are not allowed to annotate this floorplan.")
  }

  const { error: insertError } = await supabase.from("floorplan_annotations").insert({
    floorplan_id: data.floorplanId,
    label: data.label,
    annotation_type: data.annotationType,
    profile_id: data.profileId ?? null,
    geometry: data.geometry,
    metadata: data.metadata ?? null,
    created_by: profile.id,
  })

  if (insertError) {
    return createErrorState("Unable to create the annotation. Please try again.")
  }

  revalidatePath("/dashboard/floorplans")

  return successState("Annotation created.")
}

export async function updateAnnotation(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createSupbaseServerClient()
  const context = await getProfileAndAssignments(supabase)

  if ("error" in context) {
    return createErrorState(context.error)
  }

  const parsed = parseAnnotationForm(formData, true)

  if ("error" in parsed || !parsed.data?.annotationId) {
    return createErrorState(parsed.error ?? "Invalid annotation details.")
  }

  const { data } = parsed

  if (data.geometry == null || typeof data.geometry !== "object") {
    return createErrorState("Geometry must be valid JSON.")
  }

  const { data: annotation, error: annotationError } = await supabase
    .from("floorplan_annotations")
    .select("id, floorplan_id, floorplan:floorplan_id ( id, building_id )")
    .eq("id", data.annotationId)
    .maybeSingle()

  if (annotationError || !annotation || !annotation.floorplan) {
    return createErrorState("Unable to locate the annotation for update.")
  }

  const { profile, managedBuildingIds } = context

  if (!canManageFloorplan(profile.role, annotation.floorplan, managedBuildingIds)) {
    return createErrorState("You are not allowed to update this annotation.")
  }

  const { error: updateError } = await supabase
    .from("floorplan_annotations")
    .update({
      label: data.label,
      annotation_type: data.annotationType,
      profile_id: data.profileId ?? null,
      geometry: data.geometry,
      metadata: data.metadata ?? null,
    })
    .eq("id", data.annotationId)

  if (updateError) {
    return createErrorState("Unable to update the annotation. Please try again.")
  }

  revalidatePath("/dashboard/floorplans")

  return successState("Annotation updated.")
}

export async function deleteAnnotation(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createSupbaseServerClient()
  const context = await getProfileAndAssignments(supabase)

  if ("error" in context) {
    return createErrorState(context.error)
  }

  const annotationIdValue = formData.get("annotationId")

  if (typeof annotationIdValue !== "string") {
    return createErrorState("An annotation identifier is required.")
  }

  const { data: annotation, error: annotationError } = await supabase
    .from("floorplan_annotations")
    .select("id, floorplan_id, floorplan:floorplan_id ( id, building_id )")
    .eq("id", annotationIdValue)
    .maybeSingle()

  if (annotationError || !annotation || !annotation.floorplan) {
    return createErrorState("Unable to locate the annotation for deletion.")
  }

  const { profile, managedBuildingIds } = context

  if (!canManageFloorplan(profile.role, annotation.floorplan, managedBuildingIds)) {
    return createErrorState("You are not allowed to delete this annotation.")
  }

  const { error: deleteError } = await supabase
    .from("floorplan_annotations")
    .delete()
    .eq("id", annotation.id)

  if (deleteError) {
    return createErrorState("Unable to delete the annotation. Please try again.")
  }

  revalidatePath("/dashboard/floorplans")

  return successState("Annotation deleted.")
}
