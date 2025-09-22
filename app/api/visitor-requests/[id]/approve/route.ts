import { NextResponse } from "next/server"
import { z } from "zod"

import { VisitorAccessControlService, fetchVisitorRequest } from "@/lib/access-control"
import { createServiceSupabaseClient } from "@/lib/supabase-admin"

const approvalSchema = z
  .object({
    actorProfileId: z.string().uuid().optional(),
    approvalNotes: z.string().min(1).max(500).optional(),
    expiresAt: z.string().datetime().optional(),
  })
  .partial()

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  let supabase

  try {
    supabase = createServiceSupabaseClient()
  } catch (error) {
    console.error("Missing Supabase configuration", error)
    return NextResponse.json(
      { message: "Service unavailable. Supabase credentials are not configured." },
      { status: 500 }
    )
  }

  let payload: z.infer<typeof approvalSchema>

  try {
    const json = await request.json().catch(() => ({}))
    payload = approvalSchema.parse(json)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid approval payload", issues: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ message: "Unable to parse request body" }, { status: 400 })
  }

  const visitorRequest = await fetchVisitorRequest(supabase, params.id)

  if (!visitorRequest) {
    return NextResponse.json({ message: "Visitor request not found" }, { status: 404 })
  }

  try {
    const service = new VisitorAccessControlService(supabase)

    const visitEnd = new Date(visitorRequest.visit_end)
    const visitStart = new Date(visitorRequest.visit_start)
    const requestedExpiration = payload.expiresAt
      ? new Date(payload.expiresAt)
      : new Date(visitorRequest.access_code_expires_at ?? visitorRequest.visit_end)

    if (Number.isNaN(requestedExpiration.getTime())) {
      return NextResponse.json(
        { message: "Invalid expiration timestamp provided" },
        { status: 400 }
      )
    }

    if (requestedExpiration.getTime() < visitStart.getTime()) {
      return NextResponse.json(
        { message: "Access expiration cannot precede the visit start time" },
        { status: 400 }
      )
    }

    const effectiveExpiration =
      requestedExpiration.getTime() < visitEnd.getTime()
        ? visitEnd.toISOString()
        : requestedExpiration.toISOString()

    const result = await service.mintAccessCode(visitorRequest, {
      actorProfileId: payload.actorProfileId ?? null,
      approvalNotes: payload.approvalNotes ?? null,
      expiresAt: effectiveExpiration,
    })

    return NextResponse.json(
      {
        accessCode: result.accessCode,
        issuedAt: result.issuedAt,
        expiresAt: result.expiresAt,
        visitorRequest: result.request,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Failed to approve visitor request", error)
    return NextResponse.json(
      { message: "Failed to approve visitor request" },
      { status: 500 }
    )
  }
}
