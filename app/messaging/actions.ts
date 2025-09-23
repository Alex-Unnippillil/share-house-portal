"use server"

import { buildFallbackPreview, buildPreviewFromMetadata, rememberLinkPreview } from "@/lib/messaging/link-previews"

const PREVIEW_USER_AGENT =
  "ShareHousePortal/1.0 (+https://share-house.example.com; link-preview-fetcher)"

export async function fetchLinkPreview(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": PREVIEW_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`Failed to load Open Graph metadata (status ${response.status})`)
    }

    const html = await response.text()
    const preview = buildPreviewFromMetadata(url, html)

    rememberLinkPreview(preview)
    return preview
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error"
    return buildFallbackPreview(url, reason)
  }
}

