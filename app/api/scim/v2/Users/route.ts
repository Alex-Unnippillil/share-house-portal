import { NextResponse } from "next/server"

import { SCIM_LIST_RESPONSE_SCHEMA } from "@/lib/scim/constants"
import { getServiceRoleClient } from "@/lib/scim/client"
import { ScimError, toScimErrorResponse, unexpectedScimError } from "@/lib/scim/errors"
import {
  buildProfilePayload,
  createProfile,
  listProfiles,
} from "@/lib/scim/repository"
import { parseScimUserInput, profileToScimUser } from "@/lib/scim/mappers"

function parsePositiveInteger(value: string | null, fallback: number) {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new ScimError(400, "Invalid pagination value", "invalidValue")
  }
  return parsed
}

function parseFilter(filter: string | null) {
  if (!filter) return undefined
  const match = filter.match(/^(userName|id)\s+eq\s+"([^"]+)"$/i)
  if (!match) {
    throw new ScimError(400, "Unsupported filter expression", "invalidFilter")
  }
  const [, field, rawValue] = match
  return {
    field: field.toLowerCase() === "id" ? "id" : "userName",
    value: rawValue,
  } as const
}

function buildContentRange(
  startIndex: number,
  returned: number,
  total: number
) {
  if (returned === 0) {
    const start = startIndex > 0 ? startIndex - 1 : 0
    return `${start}-${start}/${total}`
  }
  const end = startIndex + returned - 1
  return `${startIndex}-${end}/${total}`
}

function buildPaginationLinks(
  url: URL,
  startIndex: number,
  requestedCount: number,
  total: number
) {
  if (requestedCount <= 0) return null
  const links: string[] = []
  const base = new URL(url.toString())
  base.search = ""
  base.hash = ""

  if (startIndex > 1) {
    const previous = new URL(base.toString())
    const previousIndex = Math.max(1, startIndex - requestedCount)
    previous.searchParams.set("startIndex", String(previousIndex))
    previous.searchParams.set("count", String(requestedCount))
    links.push(`<${previous.toString()}>; rel="prev"`)
  }

  const nextIndex = startIndex + requestedCount
  if (nextIndex <= total) {
    const next = new URL(base.toString())
    next.searchParams.set("startIndex", String(nextIndex))
    next.searchParams.set("count", String(requestedCount))
    links.push(`<${next.toString()}>; rel="next"`)
  }

  return links.length > 0 ? links.join(", ") : null
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const startIndex = Math.max(1, parsePositiveInteger(url.searchParams.get("startIndex"), 1))
    const count = parsePositiveInteger(url.searchParams.get("count"), 50)
    const filter = parseFilter(url.searchParams.get("filter"))

    const client = getServiceRoleClient()
    const { rows, total } = await listProfiles(client, {
      offset: Math.max(0, startIndex - 1),
      limit: count,
      filter,
    })

    const baseUrl = `${url.origin}${url.pathname}`.replace(/\/$/, "")
    const resources = rows.map((row) =>
      profileToScimUser(row, baseUrl)
    )

    const response = NextResponse.json(
      {
        schemas: [SCIM_LIST_RESPONSE_SCHEMA],
        Resources: resources,
        startIndex,
        itemsPerPage: resources.length,
        totalResults: total,
      },
      { status: 200 }
    )

    response.headers.set(
      "Content-Range",
      buildContentRange(startIndex, resources.length, total)
    )
    response.headers.set("X-Total-Count", String(total))
    const links = buildPaginationLinks(url, startIndex, count, total)
    if (links) {
      response.headers.set("Link", links)
    }

    return response
  } catch (error) {
    if (error instanceof ScimError) {
      return toScimErrorResponse(error)
    }
    console.error("Unexpected SCIM list error", error)
    return toScimErrorResponse(unexpectedScimError())
  }
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    const payload = await request.json()
    const normalized = parseScimUserInput(payload)

    const client = getServiceRoleClient()
    const profile = await createProfile(client, buildProfilePayload(normalized))
    const baseUrl = `${url.origin}${url.pathname}`.replace(/\/$/, "")
    const resource = profileToScimUser(profile, baseUrl)

    const response = NextResponse.json(resource, { status: 201 })
    response.headers.set("Location", `${baseUrl}/${profile.id}`)
    return response
  } catch (error) {
    if (error instanceof SyntaxError) {
      return toScimErrorResponse(
        new ScimError(400, "Invalid JSON payload", "invalidSyntax")
      )
    }
    if (error instanceof ScimError) {
      return toScimErrorResponse(error)
    }
    console.error("Unexpected SCIM create error", error)
    return toScimErrorResponse(unexpectedScimError())
  }
}
