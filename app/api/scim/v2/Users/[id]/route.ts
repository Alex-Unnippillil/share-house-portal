import { NextResponse } from "next/server"

import { getServiceRoleClient } from "@/lib/scim/client"
import { ScimError, toScimErrorResponse, unexpectedScimError } from "@/lib/scim/errors"
import {
  buildProfileUpdate,
  deleteProfile,
  getProfileById,
  updateProfile,
} from "@/lib/scim/repository"
import {
  applyPatchOperations,
  parseScimUserInput,
  profileToNormalized,
  profileToScimUser,
} from "@/lib/scim/mappers"

function buildCollectionUrl(requestUrl: URL) {
  const withoutId = requestUrl.pathname.replace(/\/+[^/]+$/, "")
  return `${requestUrl.origin}${withoutId}`.replace(/\/$/, "")
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = getServiceRoleClient()
    const profile = await getProfileById(client, params.id)
    if (!profile) {
      return toScimErrorResponse(
        new ScimError(404, "Resource not found", "notFound")
      )
    }

    const url = new URL(request.url)
    const baseUrl = buildCollectionUrl(url)
    return NextResponse.json(profileToScimUser(profile, baseUrl))
  } catch (error) {
    if (error instanceof ScimError) {
      return toScimErrorResponse(error)
    }
    console.error("Unexpected SCIM read error", error)
    return toScimErrorResponse(unexpectedScimError())
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await request.json()
    const client = getServiceRoleClient()
    const existing = await getProfileById(client, params.id)

    if (!existing) {
      return toScimErrorResponse(
        new ScimError(404, "Resource not found", "notFound")
      )
    }

    const normalized = parseScimUserInput(payload, {
      existingMetadata:
        (existing.metadata as Record<string, unknown> | undefined) ?? {},
      existingRole: existing.role ?? null,
    })

    const updated = await updateProfile(
      client,
      params.id,
      buildProfileUpdate({ ...normalized, id: params.id })
    )

    const url = new URL(request.url)
    const baseUrl = buildCollectionUrl(url)
    return NextResponse.json(profileToScimUser(updated, baseUrl))
  } catch (error) {
    if (error instanceof SyntaxError) {
      return toScimErrorResponse(
        new ScimError(400, "Invalid JSON payload", "invalidSyntax")
      )
    }
    if (error instanceof ScimError) {
      return toScimErrorResponse(error)
    }
    console.error("Unexpected SCIM replace error", error)
    return toScimErrorResponse(unexpectedScimError())
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await request.json()
    const client = getServiceRoleClient()
    const existing = await getProfileById(client, params.id)

    if (!existing) {
      return toScimErrorResponse(
        new ScimError(404, "Resource not found", "notFound")
      )
    }

    const normalized = applyPatchOperations(
      profileToNormalized(existing),
      payload
    )

    const updated = await updateProfile(
      client,
      params.id,
      buildProfileUpdate({ ...normalized, id: params.id })
    )

    const url = new URL(request.url)
    const baseUrl = buildCollectionUrl(url)
    return NextResponse.json(profileToScimUser(updated, baseUrl))
  } catch (error) {
    if (error instanceof SyntaxError) {
      return toScimErrorResponse(
        new ScimError(400, "Invalid JSON payload", "invalidSyntax")
      )
    }
    if (error instanceof ScimError) {
      return toScimErrorResponse(error)
    }
    console.error("Unexpected SCIM patch error", error)
    return toScimErrorResponse(unexpectedScimError())
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = getServiceRoleClient()
    const existing = await getProfileById(client, params.id)
    if (!existing) {
      return toScimErrorResponse(
        new ScimError(404, "Resource not found", "notFound")
      )
    }

    await deleteProfile(client, params.id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof ScimError) {
      return toScimErrorResponse(error)
    }
    console.error("Unexpected SCIM delete error", error)
    return toScimErrorResponse(unexpectedScimError())
  }
}
