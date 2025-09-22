import { NextResponse } from "next/server"

type MetricsPayload = {
  route: string
  metric: string
  value: number
  threshold?: number
  navigationStart?: number
  serverTimestamp?: number
}

const isMetricsPayload = (payload: unknown): payload is MetricsPayload => {
  if (!payload || typeof payload !== "object") {
    return false
  }

  const record = payload as Record<string, unknown>
  return (
    typeof record.route === "string" &&
    typeof record.metric === "string" &&
    typeof record.value === "number"
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!isMetricsPayload(body)) {
      return NextResponse.json({ error: "Invalid metrics payload" }, { status: 400 })
    }

    console.info("[metrics]", body)

    return NextResponse.json({ status: "ok" }, { status: 200 })
  } catch (error) {
    console.warn("Failed to parse metrics payload", error)
    return NextResponse.json({ error: "Unable to process metrics" }, { status: 400 })
  }
}
