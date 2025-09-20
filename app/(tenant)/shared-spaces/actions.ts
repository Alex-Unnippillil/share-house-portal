"use server"

import { cache } from "react"

import { mapRowToDiagram, type SharedSpaceDiagram } from "@/lib/shared-space-maps"
import { createSupbaseServerClient } from "@/utils/supaone"

const SIGNED_URL_TTL_SECONDS = 60 * 60 // 1 hour

export const getTenantSharedSpaceMaps = cache(async (): Promise<SharedSpaceDiagram[]> => {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from("shared_space_maps")
    .select("*")
    .eq("tenant_id", user.id)
    .order("updated_at", { ascending: false })

  if (error) {
    console.error("Failed to load shared space maps", error)
    throw new Error("Unable to load shared space diagrams")
  }

  if (!data) {
    return []
  }

  const diagrams = await Promise.all(
    data.map(async (row) => {
      const { data: signed, error: signedError } = await supabase.storage
        .from(row.bucket_id)
        .createSignedUrl(row.file_path, SIGNED_URL_TTL_SECONDS)

      if (signedError) {
        console.warn("Could not create signed URL for shared space map", {
          file_path: row.file_path,
          error: signedError.message,
        })
      }

      const signedUrl = signed?.signedUrl ?? null
      return mapRowToDiagram(row, signedUrl)
    })
  )

  return diagrams
})
