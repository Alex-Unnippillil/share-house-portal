"use server"

import { revalidatePath } from "next/cache"
import { Buffer } from "node:buffer"
import { extname } from "node:path"
import { z } from "zod"

import type { Json } from "@/lib/supabase"
import { createSupbaseServerClient } from "@/utils/supaone"

export type FloorplanUploadState = {
  status: "idle" | "success" | "error"
  message?: string
  fieldErrors?: Partial<Record<"name" | "width" | "height" | "householdId" | "overlays" | "file", string>>
}

const formSchema = z.object({
  name: z
    .string()
    .min(1, "A descriptive name is required.")
    .max(120, "Names must be 120 characters or fewer."),
  description: z
    .string()
    .max(500, "Descriptions must be 500 characters or fewer.")
    .optional()
    .or(z.literal("")),
  width: z.coerce.number().min(1, "Width must be greater than 0."),
  height: z.coerce.number().min(1, "Height must be greater than 0."),
  householdId: z.string().uuid("Household ID must be a valid UUID."),
})

const overlaySchema = z.object({
  id: z.string().min(1, "Overlay IDs are required."),
  label: z.string().min(1, "Overlay labels are required."),
  x: z.coerce.number().min(0, "X position cannot be negative."),
  y: z.coerce.number().min(0, "Y position cannot be negative."),
  width: z.coerce.number().min(1, "Overlay width must be greater than 0."),
  height: z.coerce.number().min(1, "Overlay height must be greater than 0."),
  description: z.string().optional(),
  color: z.string().optional(),
  occupant: z.string().optional(),
})

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "floorplan"
}

export async function uploadFloorplan(
  prevState: FloorplanUploadState,
  formData: FormData,
): Promise<FloorplanUploadState> {
  const supabase = await createSupbaseServerClient()

  const file = formData.get("file")
  if (!file || !(file instanceof File) || file.size === 0) {
    return {
      status: "error",
      message: "A floorplan image is required before uploading.",
      fieldErrors: { file: "Please choose an image file to upload." },
    }
  }

  if (!file.type || !file.type.startsWith("image/")) {
    return {
      status: "error",
      message: "Unsupported file type. Floorplans must be uploaded as images.",
      fieldErrors: { file: "Upload a PNG, JPEG, or SVG floorplan image." },
    }
  }

  if (file.size > 10 * 1024 * 1024) {
    return {
      status: "error",
      message: "The uploaded file is too large.",
      fieldErrors: { file: "Images must be 10MB or smaller." },
    }
  }

  const parsed = formSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    width: formData.get("width"),
    height: formData.get("height"),
    householdId: formData.get("householdId"),
  })

  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(
      Object.entries(parsed.error.flatten().fieldErrors).map(([key, value]) => [
        key as keyof FloorplanUploadState["fieldErrors"],
        value?.join(" "),
      ]),
    ) as FloorplanUploadState["fieldErrors"]

    return {
      status: "error",
      message: "Please correct the highlighted fields and try again.",
      fieldErrors,
    }
  }

  const { name, description, width, height, householdId } = parsed.data
  let overlays: Json = []
  const overlaysRaw = formData.get("overlays")

  if (typeof overlaysRaw === "string" && overlaysRaw.trim().length > 0) {
    let overlaysJson: unknown

    try {
      overlaysJson = JSON.parse(overlaysRaw)
    } catch (error) {
      console.error("Failed to parse overlay JSON", error)
      return {
        status: "error",
        message: "Overlays must be valid JSON.",
        fieldErrors: { overlays: "Enter valid JSON for overlay regions." },
      }
    }

    const overlaysResult = overlaySchema.array().safeParse(overlaysJson)
    if (!overlaysResult.success) {
      return {
        status: "error",
        message: "One or more overlays are invalid.",
        fieldErrors: {
          overlays: overlaysResult.error.issues
            .map((issue) => issue.message)
            .join(" "),
        },
      }
    }

    overlays = overlaysResult.data as unknown as Json
  }

  const extension = (extname(file.name) || ".png").toLowerCase()
  const fileName = `${slugify(name)}-${Date.now()}${extension}`
  const storagePath = `${householdId}/${fileName}`

  const fileBuffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage.from("floorplans").upload(storagePath, fileBuffer, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  })

  if (uploadError) {
    console.error("Failed to upload floorplan image", uploadError)
    return {
      status: "error",
      message: "We could not upload the image to storage. Please try again.",
    }
  }

  const { error: insertError } = await supabase.from("floorplans").insert({
    name,
    description: description?.toString().trim() ? description.toString().trim() : null,
    width,
    height,
    household_id: householdId,
    storage_path: storagePath,
    overlays,
  })

  if (insertError) {
    console.error("Failed to create floorplan record", insertError)
    await supabase.storage.from("floorplans").remove([storagePath])
    return {
      status: "error",
      message: "The floorplan metadata could not be saved. Please try again.",
    }
  }

  revalidatePath("/dashboard/floorplans")
  revalidatePath("/floorplan")

  return {
    status: "success",
    message: "Floorplan uploaded successfully.",
  }
}
