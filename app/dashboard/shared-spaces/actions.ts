"use server"

import { revalidatePath } from "next/cache"
import { Buffer } from "node:buffer"
import { randomUUID } from "node:crypto"
import { extname } from "node:path"
import { z } from "zod"

import {
  mapRowToDiagram,
  type SharedSpaceDiagram,
} from "@/lib/shared-space-maps"
import { createSupbaseServerClient } from "@/utils/supaone"
import type {
  SharedSpaceMapInsert,
  SharedSpaceMapRow,
  SharedSpaceMapUpdate,
  TypedSupabaseClient,
} from "@/utils/typed-supabase-client"

const DEFAULT_BUCKET_ID = "shared-space-maps"
const SIGNED_URL_TTL_SECONDS = 60 * 60

const createFieldsSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required"),
  leaseId: z.string().min(1, "Lease ID is required"),
  unitId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  bucketId: z.string().min(1).optional(),
  diagramUpdatedAt: z.string().optional(),
})

const roomLabelSchema = z.object({
  id: z.string().optional(),
  key: z.string().optional(),
  slug: z.string().optional(),
  identifier: z.string().optional(),
  title: z.string().optional(),
  label: z.string().optional(),
  name: z.string().optional(),
  text: z.string().optional(),
  description: z.string().optional().or(z.null()).optional(),
  tooltip: z.string().optional().or(z.null()).optional(),
  note: z.string().optional().or(z.null()).optional(),
  x: z.number().min(0).max(1).optional(),
  y: z.number().min(0).max(1).optional(),
  position: z
    .object({
      x: z.number().min(0).max(1).optional(),
      y: z.number().min(0).max(1).optional(),
    })
    .optional(),
  data: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
})

const roomLabelsSchema = z.array(roomLabelSchema)
const metadataSchema = z.record(z.any())

export type SharedSpaceActionResult =
  | { status: "success"; message: string }
  | { status: "error"; message: string }

async function requireAdminClient() {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    throw new Error(authError.message)
  }

  if (!user) {
    throw new Error("Authentication required")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    throw new Error(profileError.message)
  }

  if (!profile || (profile.role ?? "user") !== "admin") {
    throw new Error("Admin access required to manage shared spaces")
  }

  return { supabase, userId: user.id }
}

function parseJsonField<T>(
  value: FormDataEntryValue | null,
  schema: z.Schema<T>,
  fallback: T,
  context: string
): { ok: true; value: T } | { ok: false; message: string } {
  if (value === null || value === undefined) {
    return { ok: true, value: fallback }
  }

  if (typeof value !== "string") {
    return { ok: false, message: `${context} must be valid JSON` }
  }

  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return { ok: true, value: fallback }
  }

  try {
    const parsed = JSON.parse(trimmed)
    const validated = schema.parse(parsed)
    return { ok: true, value: validated }
  } catch (error) {
    return { ok: false, message: `${context} must be valid JSON` }
  }
}

function parseDiagramUpdatedAt(
  value: string | null | undefined
): { ok: true; value?: string } | { ok: false; message: string } {
  if (!value) {
    return { ok: true, value: undefined }
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return { ok: true, value: undefined }
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, message: "Diagram timestamp must be a valid date" }
  }

  return { ok: true, value: parsed.toISOString() }
}

function buildFilePath(tenantId: string, leaseId: string, fileName: string) {
  const extension = extname(fileName)
  const base = fileName.slice(0, fileName.length - extension.length)
  const normalizedBase = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  const unique = randomUUID()
  const safeBase = normalizedBase.length > 0 ? normalizedBase : "diagram"
  return `${tenantId}/${leaseId}/${unique}-${safeBase}${extension}`
}

async function fetchSharedSpaceMapById(supabase: TypedSupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("shared_space_maps")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error("Shared space map not found")
  }

  return data
}

async function createSignedUrlForRow(supabase: TypedSupabaseClient, row: SharedSpaceMapRow) {
  const { data: signed, error } = await supabase.storage
    .from(row.bucket_id)
    .createSignedUrl(row.file_path, SIGNED_URL_TTL_SECONDS)

  if (error) {
    console.warn("Unable to generate signed URL for shared space map", {
      id: row.id,
      error: error.message,
    })
  }

  return signed?.signedUrl ?? null
}

export async function getSharedSpaceMapsForAdmin(): Promise<SharedSpaceDiagram[]> {
  const { supabase } = await requireAdminClient()

  const { data, error } = await supabase
    .from("shared_space_maps")
    .select("*")
    .order("updated_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    return []
  }

  const diagrams = await Promise.all(
    data.map(async (row) => {
      const signedUrl = await createSignedUrlForRow(supabase, row)
      return mapRowToDiagram(row, signedUrl)
    })
  )

  return diagrams
}

export async function createSharedSpaceMap(
  formData: FormData
): Promise<SharedSpaceActionResult> {
  try {
    const { supabase } = await requireAdminClient()

    const parsed = createFieldsSchema.parse({
      tenantId: formData.get("tenantId"),
      leaseId: formData.get("leaseId"),
      unitId: formData.get("unitId"),
      title: formData.get("title"),
      description: formData.get("description"),
      bucketId: formData.get("bucketId"),
      diagramUpdatedAt: formData.get("diagramUpdatedAt"),
    })

    const metadataResult = parseJsonField(formData.get("metadata"), metadataSchema, {}, "Metadata")
    if (!metadataResult.ok) {
      return { status: "error", message: metadataResult.message }
    }

    const roomLabelsResult = parseJsonField(
      formData.get("roomLabels"),
      roomLabelsSchema,
      [],
      "Room labels"
    )
    if (!roomLabelsResult.ok) {
      return { status: "error", message: roomLabelsResult.message }
    }

    const timestampResult = parseDiagramUpdatedAt(parsed.diagramUpdatedAt ?? null)
    if (!timestampResult.ok) {
      return { status: "error", message: timestampResult.message }
    }

    const file = formData.get("file") as File | null
    if (!file || file.size === 0) {
      return { status: "error", message: "Please upload a diagram file" }
    }

    const bucketId = parsed.bucketId ?? DEFAULT_BUCKET_ID
    const filePath = buildFilePath(parsed.tenantId, parsed.leaseId, file.name)

    const arrayBuffer = await file.arrayBuffer()
    const uploadResult = await supabase.storage
      .from(bucketId)
      .upload(filePath, Buffer.from(arrayBuffer), {
        upsert: true,
        contentType: file.type || "application/octet-stream",
      })

    if (uploadResult.error) {
      return { status: "error", message: uploadResult.error.message }
    }

    const payload: SharedSpaceMapInsert = {
      tenant_id: parsed.tenantId,
      lease_id: parsed.leaseId,
      unit_id: parsed.unitId?.length ? parsed.unitId : null,
      title: parsed.title,
      description: parsed.description?.trim() ? parsed.description.trim() : null,
      bucket_id: bucketId,
      file_path: filePath,
      metadata: metadataResult.value,
      room_labels: roomLabelsResult.value,
      diagram_updated_at: timestampResult.value ?? undefined,
    }

    const { error } = await supabase.from("shared_space_maps").insert(payload)
    if (error) {
      return { status: "error", message: error.message }
    }

    await Promise.all([
      revalidatePath("/dashboard/shared-spaces"),
      revalidatePath("/shared-spaces"),
    ])

    return { status: "success", message: "Shared space diagram created" }
  } catch (error) {
    console.error("createSharedSpaceMap", error)
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to create shared space diagram",
    }
  }
}

export async function updateSharedSpaceMap(
  formData: FormData
): Promise<SharedSpaceActionResult> {
  try {
    const { supabase } = await requireAdminClient()

    const id = formData.get("id")
    if (typeof id !== "string" || id.trim().length === 0) {
      return { status: "error", message: "Diagram identifier is required" }
    }

    const existing = await fetchSharedSpaceMapById(supabase, id)

    const metadataResult = parseJsonField(
      formData.get("metadata"),
      metadataSchema,
      (existing.metadata as Record<string, unknown> | null) ?? {},
      "Metadata"
    )
    if (!metadataResult.ok) {
      return { status: "error", message: metadataResult.message }
    }

    const roomLabelsResult = parseJsonField(
      formData.get("roomLabels"),
      roomLabelsSchema,
      Array.isArray(existing.room_labels) ? (existing.room_labels as unknown[]) : [],
      "Room labels"
    )
    if (!roomLabelsResult.ok) {
      return { status: "error", message: roomLabelsResult.message }
    }

    const diagramUpdatedAtInput = formData.get("diagramUpdatedAt")
    const timestampResult = parseDiagramUpdatedAt(
      typeof diagramUpdatedAtInput === "string" ? diagramUpdatedAtInput : null
    )
    if (!timestampResult.ok) {
      return { status: "error", message: timestampResult.message }
    }

    const updates: SharedSpaceMapUpdate = {}

    const tenantId = formData.get("tenantId")
    if (typeof tenantId === "string" && tenantId.trim().length > 0 && tenantId !== existing.tenant_id) {
      updates.tenant_id = tenantId.trim()
    }

    const leaseId = formData.get("leaseId")
    if (typeof leaseId === "string" && leaseId.trim().length > 0 && leaseId !== existing.lease_id) {
      updates.lease_id = leaseId.trim()
    }

    if (formData.has("unitId")) {
      const unitId = formData.get("unitId")
      if (typeof unitId === "string" && unitId.trim().length > 0) {
        updates.unit_id = unitId.trim()
      } else {
        updates.unit_id = null
      }
    }

    if (formData.has("title")) {
      const title = formData.get("title")
      if (typeof title === "string" && title.trim().length > 0) {
        updates.title = title.trim()
      }
    }

    if (formData.has("description")) {
      const description = formData.get("description")
      if (typeof description === "string" && description.trim().length > 0) {
        updates.description = description.trim()
      } else {
        updates.description = null
      }
    }

    updates.metadata = metadataResult.value
    updates.room_labels = roomLabelsResult.value

    if (timestampResult.value) {
      updates.diagram_updated_at = timestampResult.value
    }

    const bucketIdInput = formData.get("bucketId")
    const bucketOverride =
      typeof bucketIdInput === "string" && bucketIdInput.trim().length > 0
        ? bucketIdInput.trim()
        : null

    const file = formData.get("file") as File | null
    if (bucketOverride && (!file || file.size === 0)) {
      return {
        status: "error",
        message: "Upload a new file when changing storage buckets",
      }
    }

    let filePath = existing.file_path
    let bucketId = bucketOverride ?? existing.bucket_id

    if (file && file.size > 0) {
      bucketId = bucketOverride ?? existing.bucket_id ?? DEFAULT_BUCKET_ID
      filePath = buildFilePath(updates.tenant_id ?? existing.tenant_id, updates.lease_id ?? existing.lease_id, file.name)

      const arrayBuffer = await file.arrayBuffer()
      const uploadResult = await supabase.storage
        .from(bucketId)
        .upload(filePath, Buffer.from(arrayBuffer), {
          upsert: true,
          contentType: file.type || "application/octet-stream",
        })

      if (uploadResult.error) {
        return { status: "error", message: uploadResult.error.message }
      }

      updates.file_path = filePath
      updates.bucket_id = bucketId

      if (timestampResult.value === undefined) {
        updates.diagram_updated_at = new Date().toISOString()
      }

      await supabase.storage
        .from(existing.bucket_id)
        .remove([existing.file_path])
        .catch((error) => {
          console.warn("Unable to remove previous diagram", { id, error })
        })
    } else if (bucketOverride) {
      updates.bucket_id = bucketOverride
    }

    const { error } = await supabase.from("shared_space_maps").update(updates).eq("id", id)
    if (error) {
      return { status: "error", message: error.message }
    }

    await Promise.all([
      revalidatePath("/dashboard/shared-spaces"),
      revalidatePath("/shared-spaces"),
    ])

    return { status: "success", message: "Shared space diagram updated" }
  } catch (error) {
    console.error("updateSharedSpaceMap", error)
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to update shared space diagram",
    }
  }
}

export async function deleteSharedSpaceMap(
  formData: FormData
): Promise<SharedSpaceActionResult> {
  try {
    const { supabase } = await requireAdminClient()

    const id = formData.get("id")
    if (typeof id !== "string" || id.trim().length === 0) {
      return { status: "error", message: "Diagram identifier is required" }
    }

    const existing = await fetchSharedSpaceMapById(supabase, id)

    const { error } = await supabase.from("shared_space_maps").delete().eq("id", id)
    if (error) {
      return { status: "error", message: error.message }
    }

    await supabase.storage
      .from(existing.bucket_id)
      .remove([existing.file_path])
      .catch((storageError) => {
        console.warn("Unable to remove shared space diagram from storage", {
          id,
          error: storageError,
        })
      })

    await Promise.all([
      revalidatePath("/dashboard/shared-spaces"),
      revalidatePath("/shared-spaces"),
    ])

    return { status: "success", message: "Shared space diagram deleted" }
  } catch (error) {
    console.error("deleteSharedSpaceMap", error)
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to delete shared space diagram",
    }
  }
}
