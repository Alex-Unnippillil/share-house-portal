import { NextResponse } from "next/server"

import {
  VisitorAccessControlService,
  isRevocationEligible,
  listRequestsPendingRevocation,
} from "@/lib/access-control"
import { createServiceSupabaseClient } from "@/lib/supabase-admin"

export async function GET() {
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
  const service = new VisitorAccessControlService(supabase)
  const now = new Date().toISOString()

  const expiringRequests = await listRequestsPendingRevocation(supabase, now)

  let revokedCount = 0
  const failures: Array<{ requestId: string; message: string }> = []

  for (const request of expiringRequests) {
    if (!isRevocationEligible(request, now)) {
      continue
    }

    try {
      await service.revokeRequest(request, {
        reason: "Visit window expired",
      })
      revokedCount += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      failures.push({ requestId: request.id, message })
    }
  }

  return NextResponse.json({
    checked: expiringRequests.length,
    revoked: revokedCount,
    failures,
    timestamp: now,
  })
}
