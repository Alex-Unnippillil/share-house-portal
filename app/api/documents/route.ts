import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { fetchDocumentsList } from "@/lib/data/documents"
import { fetchMemberRole } from "@/lib/data/members"
import { documentListFiltersSchema } from "@/lib/validation/documents"
import type { DocumentListFilters } from "@/types/documents"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"
import { createClient } from "@/utils/supa-server-actions"

const NDJSON_CONTENT_TYPE = "application/x-ndjson"

type DocumentStreamMeta = {
  count: number
  filters: DocumentListFilters
}

function serializeNdjsonChunk(payload: unknown) {
  return `${JSON.stringify(payload)}\n`
}

export async function GET(request: NextRequest) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const typedSupabase = supabase as unknown as TypedSupabaseClient

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const params = request.nextUrl.searchParams

  const rawFilters: Partial<Record<keyof DocumentListFilters, string | string[]>> = {
    status: params.getAll("status"),
    type: params.getAll("type"),
    tenant_id: params.get("tenant_id") ?? undefined,
    unit_id: params.get("unit_id") ?? undefined,
    date_from: params.get("date_from") ?? undefined,
    date_to: params.get("date_to") ?? undefined,
  }

  const normalizedFilters: DocumentListFilters = {
    status:
      Array.isArray(rawFilters.status) && rawFilters.status.length > 0
        ? (rawFilters.status as DocumentListFilters["status"])
        : undefined,
    type:
      Array.isArray(rawFilters.type) && rawFilters.type.length > 0
        ? (rawFilters.type as DocumentListFilters["type"])
        : undefined,
    tenant_id: typeof rawFilters.tenant_id === "string" ? rawFilters.tenant_id : undefined,
    unit_id: typeof rawFilters.unit_id === "string" ? rawFilters.unit_id : undefined,
    date_from: typeof rawFilters.date_from === "string" ? rawFilters.date_from : undefined,
    date_to: typeof rawFilters.date_to === "string" ? rawFilters.date_to : undefined,
  }

  const validation = documentListFiltersSchema.safeParse(normalizedFilters)

  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Invalid filters",
        details: validation.error.flatten(),
      },
      { status: 400 }
    )
  }

  let role: Awaited<ReturnType<typeof fetchMemberRole>>

  try {
    role = await fetchMemberRole(typedSupabase, user.id)
  } catch (error) {
    console.error("Failed to resolve member role", {
      userId: user.id,
      error,
    })

    return NextResponse.json(
      { error: "Failed to resolve member role" },
      { status: 500 }
    )
  }

  let documents

  try {
    documents = await fetchDocumentsList({
      client: typedSupabase,
      userId: user.id,
      role,
      filters: validation.data,
    })
  } catch (error) {
    console.error("Failed to fetch documents for streaming", {
      userId: user.id,
      error,
    })

    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    )
  }

  const meta: DocumentStreamMeta = {
    count: documents.length,
    filters: validation.data,
  }

  const acceptHeader = request.headers.get("accept") ?? ""

  if (!acceptHeader.includes(NDJSON_CONTENT_TYPE)) {
    return NextResponse.json({ data: documents, meta })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      try {
        controller.enqueue(
          encoder.encode(
            serializeNdjsonChunk({
              type: "meta",
              meta,
            })
          )
        )

        for (const document of documents) {
          controller.enqueue(
            encoder.encode(
              serializeNdjsonChunk({
                type: "document",
                data: document,
              })
            )
          )
        }

        controller.enqueue(encoder.encode(serializeNdjsonChunk({ type: "end" })))
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": NDJSON_CONTENT_TYPE,
      "Cache-Control": "no-store",
    },
  })
}
