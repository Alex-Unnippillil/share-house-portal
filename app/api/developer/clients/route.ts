import { NextResponse } from "next/server"
import { z } from "zod"

import {
  issueClientCredentials,
  OAuthClientError,
} from "@/lib/supabase"
import { ensureDeveloperAdmin } from "../_shared"

const createClientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters long")
    .max(120, "Name must be 120 characters or fewer"),
  redirectUri: z
    .string()
    .trim()
    .url("Redirect URI must be a valid URL")
    .optional(),
  description: z
    .string()
    .trim()
    .max(512, "Description must be 512 characters or fewer")
    .optional(),
})

export async function POST(request: Request) {
  const adminCheck = await ensureDeveloperAdmin()
  if ("response" in adminCheck) {
    return adminCheck.response
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    console.warn("[developer] Received invalid JSON while creating OAuth client")
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const parsed = createClientSchema.safeParse(payload)
  if (!parsed.success) {
    console.warn("[developer] OAuth client validation failed", parsed.error.flatten())
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    )
  }

  const { name, redirectUri, description } = parsed.data

  try {
    const credentials = await issueClientCredentials({
      name,
      redirectUri,
      description,
      createdBy: adminCheck.userId,
    })

    console.info("[developer] issued OAuth client", {
      clientId: credentials.clientId,
      userId: adminCheck.userId,
    })

    return NextResponse.json({
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      keyId: credentials.keyId,
    })
  } catch (error) {
    if (error instanceof OAuthClientError) {
      console.error("[developer] Failed to issue OAuth client", error)
      return NextResponse.json(
        { error: error.message },
        { status: error.status ?? 500 }
      )
    }

    console.error("[developer] Unexpected error while issuing OAuth client", error)
    return NextResponse.json(
      { error: "Failed to create OAuth client" },
      { status: 500 }
    )
  }
}
