import { NextResponse } from "next/server"

import { generateETag, isIfNoneMatchFresh } from "@/lib/api/etag"
import { fetchDocumentsForApi } from "@/lib/server/documents-snapshot"
import type { DocumentWithLease } from "@/types/documents"

const CACHE_CONTROL_HEADER = "private, max-age=0, must-revalidate"

const buildResponseHeaders = (etag: string, lastModified: string | null) => {
  const headers: Record<string, string> = {
    ETag: etag,
    "Cache-Control": CACHE_CONTROL_HEADER,
  }

  if (lastModified) {
    headers["Last-Modified"] = new Date(lastModified).toUTCString()
  }

  return headers
}

const getLatestTimestamp = (documents: DocumentWithLease[]) => {
  let latest: string | null = null

  for (const document of documents) {
    const candidate = document.updated_at ?? document.created_at
    if (!latest || new Date(candidate) > new Date(latest)) {
      latest = candidate
    }
  }

  return latest
}

const createFingerprint = (documents: DocumentWithLease[]) => {
  if (!documents.length) {
    return "empty"
  }

  return [...documents]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((document) => `${document.id}:${document.updated_at}:${document.version}`)
    .join("|")
}

export const GET = async (request: Request) => {
  try {
    const documents = await fetchDocumentsForApi()
    const lastModified = getLatestTimestamp(documents)
    const fingerprint = createFingerprint(documents)
    const etag = generateETag(fingerprint)

    if (isIfNoneMatchFresh(request.headers.get("if-none-match"), etag)) {
      return new NextResponse(null, {
        status: 304,
        headers: buildResponseHeaders(etag, lastModified),
      })
    }

    return NextResponse.json(
      { documents, lastModified },
      {
        headers: buildResponseHeaders(etag, lastModified),
      }
    )
  } catch (error) {
    console.error("Documents API error:", error)
    return NextResponse.json(
      { error: "Failed to load documents." },
      { status: 500 }
    )
  }
}
