import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { createClient } from "@/utils/supa-server-actions"
import { createContentRange, parseRangeHeader } from "@/lib/documents/pdf-streaming"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id, file_url, tenant_id")
    .eq("id", params.id)
    .single()

  if (documentError || !document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  let hasAccess = profile?.role === "admin" || profile?.role === "property_manager"

  if (!hasAccess && document.tenant_id === user.id) {
    hasAccess = true
  }

  if (!hasAccess) {
    const { data: signer } = await supabase
      .from("document_signatures")
      .select("id")
      .eq("document_id", document.id)
      .eq("signer_id", user.id)
      .maybeSingle()

    hasAccess = Boolean(signer)
  }

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!document.file_url) {
    return NextResponse.json({ error: "Document file missing" }, { status: 404 })
  }

  const rangeHeader = request.headers.get("range")
  const upstreamHeaders: HeadersInit = {}
  if (rangeHeader) {
    upstreamHeaders["Range"] = rangeHeader
  }

  const upstreamResponse = await fetch(document.file_url, {
    headers: upstreamHeaders,
    cache: "no-store",
  })

  if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
    return NextResponse.json(
      { error: "Unable to fetch document stream" },
      { status: 502 }
    )
  }

  const responseHeaders = new Headers()
  responseHeaders.set("Accept-Ranges", "bytes")
  responseHeaders.set("Vary", "Range")

  const passthroughHeaders = [
    "content-type",
    "content-length",
    "content-range",
    "last-modified",
    "etag",
  ]

  for (const header of passthroughHeaders) {
    const value = upstreamResponse.headers.get(header)
    if (value) {
      responseHeaders.set(header, value)
    }
  }

  if (!responseHeaders.has("cache-control")) {
    responseHeaders.set("Cache-Control", "private, max-age=0, must-revalidate")
  }

  if (rangeHeader && !responseHeaders.has("content-range")) {
    const parsedRange = parseRangeHeader(rangeHeader)
    const totalSizeHeader = upstreamResponse.headers.get("content-length")
    if (parsedRange && totalSizeHeader) {
      const totalSize = Number.parseInt(totalSizeHeader, 10)
      const rangeHeaders = createContentRange(parsedRange, totalSize)
      if (rangeHeaders) {
        responseHeaders.set("Content-Range", rangeHeaders.contentRange)
        responseHeaders.set("Content-Length", `${rangeHeaders.contentLength}`)
      }
    }
  }

  const status = rangeHeader ? 206 : upstreamResponse.status

  return new Response(upstreamResponse.body, {
    status,
    headers: responseHeaders,
  })
}
