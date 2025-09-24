import { NextResponse } from "next/server"

import { withServerTiming } from "@/lib/server-timing"

import { buildCollectionCacheMetadata } from "@/lib/utils"

type DocumentRecord = {
  id: string
  title: string
  status:
    | "draft"
    | "pending_signature"
    | "signed"
    | "expired"
    | "cancelled"
  updated_at: string
  tenant_id: string
}

type RevisionKey = "current" | "revision2"

const documentRevisions: Record<RevisionKey, DocumentRecord[]> = {
  current: [
    {
      id: "doc-1",
      title: "Lease Agreement",
      status: "signed",
      updated_at: "2024-06-12T09:00:00.000Z",
      tenant_id: "tenant-1",
    },
    {
      id: "doc-2",
      title: "Move-in Checklist",
      status: "pending_signature",
      updated_at: "2024-06-18T17:30:00.000Z",
      tenant_id: "tenant-2",
    },
  ],
  revision2: [
    {
      id: "doc-1",
      title: "Lease Agreement",
      status: "signed",
      updated_at: "2024-06-12T09:00:00.000Z",
      tenant_id: "tenant-1",
    },
    {
      id: "doc-2",
      title: "Move-in Checklist",
      status: "signed",
      updated_at: "2024-07-01T12:45:00.000Z",
      tenant_id: "tenant-2",
    },
    {
      id: "doc-3",
      title: "Guest Policy",
      status: "draft",
      updated_at: "2024-07-04T08:15:00.000Z",
      tenant_id: "tenant-3",
    },
  ],
}

const DEFAULT_REVISION: RevisionKey = "current"

async function getDocuments(request: Request) {
  const url = new URL(request.url)
  const revisionParam = url.searchParams.get("revision")
  const revision =
    revisionParam && revisionParam in documentRevisions
      ? (revisionParam as RevisionKey)
      : DEFAULT_REVISION

  const records = documentRevisions[revision]
  const cacheMetadata = buildCollectionCacheMetadata(records)
  const ifNoneMatch = request.headers.get("if-none-match")

  if (ifNoneMatch && ifNoneMatch === cacheMetadata.etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: cacheMetadata.etag,
      },
    })
  }

  const response = NextResponse.json(
    {
      documents: records,
      meta: {
        count: cacheMetadata.count,
        latestUpdatedAt: cacheMetadata.latestUpdatedAt,
        revision,
      },
    },
    {
      status: 200,
    }
  )

  response.headers.set("ETag", cacheMetadata.etag)

  return response
}

export const GET = withServerTiming(getDocuments, "api.documents")
