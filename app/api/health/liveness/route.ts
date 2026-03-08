import { NextResponse } from "next/server"

import { buildHealthResponse } from "../checks"

export async function GET() {
  const checks = {
    process: {
      status: "pass" as const,
      message: "Process is running",
      meta: {
        uptimeSeconds: Number(process.uptime().toFixed(2)),
        pid: process.pid,
        memoryRssBytes: process.memoryUsage().rss,
      },
      checkedAt: new Date().toISOString(),
    },
  }

  const response = buildHealthResponse(checks)

  return NextResponse.json(response)
}
