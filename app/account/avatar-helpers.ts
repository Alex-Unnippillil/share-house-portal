import type { SupabaseClient } from "@supabase/supabase-js"

export const AVATAR_VARIANTS = [
  { key: "sm", size: 96 },
  { key: "md", size: 192 },
  { key: "lg", size: 384 },
] as const

export type AvatarVariantKey = (typeof AVATAR_VARIANTS)[number]["key"]

export type AvatarVariantBlobs = Partial<Record<AvatarVariantKey, Blob>> & { md: Blob }

export interface UploadAvatarVariantsResult {
  fileKey: string
  paths: Partial<Record<AvatarVariantKey, string>>
  defaultPath: string
}

const IMAGE_MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
}

function normaliseExtension(extension: string): string {
  return extension.replace(/^\./, "").toLowerCase()
}

function inferMimeType(extension: string): string {
  const normalised = normaliseExtension(extension)
  return IMAGE_MIME_TYPES[normalised] ?? "image/jpeg"
}

export function buildVariantPathSet(path: string): Record<AvatarVariantKey, string | null> {
  const trimmed = path.trim()
  const match = trimmed.match(/^(.*)-(sm|md|lg)\.([A-Za-z0-9]+)$/)
  if (!match) {
    return { sm: null, md: trimmed, lg: null }
  }

  const [, base, , extension] = match

  return {
    sm: `${base}-sm.${extension}`,
    md: trimmed,
    lg: `${base}-lg.${extension}`,
  }
}

export async function uploadAvatarVariants(
  client: SupabaseClient,
  uid: string,
  blobs: AvatarVariantBlobs,
  extension = "jpg",
  now = Date.now(),
): Promise<UploadAvatarVariantsResult> {
  if (!uid) {
    throw new Error("A user id is required to upload avatar variants")
  }

  const normalisedExtension = normaliseExtension(extension)
  const contentType = inferMimeType(normalisedExtension)
  const fileKey = `${uid}/avatar-${now}`
  const bucket = client.storage.from("avatars")
  const uploadedPaths: Partial<Record<AvatarVariantKey, string>> = {}

  for (const [variant, blob] of Object.entries(blobs) as [AvatarVariantKey, Blob | undefined][]) {
    if (!blob) continue

    const path = `${fileKey}-${variant}.${normalisedExtension}`
    const { error } = await bucket.upload(path, blob, {
      cacheControl: "3600",
      contentType,
    })

    if (error) {
      throw error
    }

    uploadedPaths[variant] = path
  }

  const defaultPath = uploadedPaths.md
  if (!defaultPath) {
    throw new Error("A medium avatar variant must be provided")
  }

  return { fileKey, paths: uploadedPaths, defaultPath }
}
