import { getGraphQLParameters, processRequest, renderGraphiQL, shouldRenderGraphiQL } from "graphql-helix"
import type { NextRequest } from "next/server"

import { createGraphQLContext } from "./context"
import { schema } from "./schema"

type HelixRequest = {
  body: unknown
  headers: Record<string, string>
  method: string
  query: Record<string, string>
}

function buildHelixRequest(request: NextRequest): HelixRequest {
  const query = Object.fromEntries(request.nextUrl.searchParams.entries())
  const headers = Object.fromEntries(request.headers.entries())

  return {
    body: undefined,
    headers,
    method: request.method,
    query,
  }
}

async function handleRequest(request: NextRequest): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 })
  }

  const helixRequest = buildHelixRequest(request)

  if (request.method !== "GET") {
    const rawBody = await request.text()
    if (rawBody) {
      try {
        helixRequest.body = JSON.parse(rawBody)
      } catch (error) {
        helixRequest.body = rawBody
      }
    }
  }

  if (shouldRenderGraphiQL(helixRequest)) {
    const graphiql = renderGraphiQL({ endpoint: "/api/graphql" })
    return new Response(graphiql, {
      headers: { "Content-Type": "text/html" },
    })
  }

  const { operationName, query, variables } = getGraphQLParameters(helixRequest)

  const result = await processRequest({
    operationName,
    query,
    variables,
    request: helixRequest,
    schema,
    contextFactory: () => createGraphQLContext(),
  })

  switch (result.type) {
    case "RESPONSE": {
      const headers = Object.fromEntries(result.headers.entries())
      const body = JSON.stringify(result.payload)
      return new Response(body, {
        status: result.status,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      })
    }
    case "MULTIPART_RESPONSE": {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          result.subscribe(
            (payload) => {
              controller.enqueue(
                encoder.encode(
                  `--graphql\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(payload)}\r\n`
                )
              )
            },
            (error) => {
              controller.error(error)
            },
            () => {
              controller.enqueue(encoder.encode("--graphql--"))
              controller.close()
            }
          )
        },
      })

      const headers = Object.fromEntries(result.headers.entries())

      return new Response(stream, {
        status: result.status,
        headers: {
          "Content-Type": 'multipart/mixed; boundary="graphql"',
          ...headers,
        },
      })
    }
    default:
      return new Response(null, { status: 405 })
  }
}

export async function GET(request: NextRequest) {
  return handleRequest(request)
}

export async function POST(request: NextRequest) {
  return handleRequest(request)
}
