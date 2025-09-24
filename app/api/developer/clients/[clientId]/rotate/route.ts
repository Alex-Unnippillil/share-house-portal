import { NextResponse } from "next/server"

import {
  OAuthClientError,
  OAuthClientNotFoundError,
  rotateClientSecret,
} from "@/lib/supabase"
import { ensureDeveloperAdmin } from "../../../_shared"

type RouteContext = {
  params: {
    clientId?: string
  }
}

export async function POST(_request: Request, { params }: RouteContext) {
  const adminCheck = await ensureDeveloperAdmin()
  if ("response" in adminCheck) {
    return adminCheck.response
  }

  const clientId = params.clientId?.trim()
  if (!clientId) {
    console.warn("[developer] Rotation requested without a client identifier")
    return NextResponse.json({ error: "Client ID is required" }, { status: 400 })
  }

  try {
    const rotation = await rotateClientSecret({
      clientId,
      rotatedBy: adminCheck.userId,
    })

    console.info("[developer] rotated OAuth client secret", {
      clientId,
      keyId: rotation.keyId,
      userId: adminCheck.userId,
    })

    return NextResponse.json({
      clientId: rotation.clientId,
      clientSecret: rotation.clientSecret,
      keyId: rotation.keyId,
      previousKeyId: rotation.previousKeyId,
    })
  } catch (error) {
    if (error instanceof OAuthClientNotFoundError) {
      console.warn("[developer] Attempted to rotate unknown OAuth client", {
        clientId,
      })
      return NextResponse.json(
        { error: error.message },
        { status: error.status ?? 404 }
      )
    }

    if (error instanceof OAuthClientError) {
      console.error("[developer] Failed to rotate OAuth client secret", error)
      return NextResponse.json(
        { error: error.message },
        { status: error.status ?? 500 }
      )
    }

    console.error(
      "[developer] Unexpected error while rotating OAuth client secret",
      error
    )
    return NextResponse.json(
      { error: "Failed to rotate client secret" },
      { status: 500 }
    )
  }
}
