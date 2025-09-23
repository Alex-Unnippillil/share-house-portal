import { NextRequest, NextResponse } from "next/server"

import { runDigestJob } from "@/lib/notifications/digest"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

async function handleDigestRequest(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authorization = request.headers.get("authorization")
    if (authorization !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const results = await runDigestJob()
    return NextResponse.json({ results })
  } catch (error) {
    console.error("Digest cron job failed", error)
    return NextResponse.json(
      {
        error: "Failed to run digest job",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

export const GET = handleDigestRequest
export const POST = handleDigestRequest
