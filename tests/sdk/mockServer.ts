import http, { IncomingMessage, ServerResponse } from "node:http"
import { AddressInfo } from "node:net"
import { URL } from "node:url"

export interface MockCall {
  method: string
  path: string
  query: Record<string, string>
  headers: http.IncomingHttpHeaders
  body?: unknown
}

export interface MockServer {
  baseUrl: string
  calls: MockCall[]
  close: () => Promise<void>
  clearCalls: () => void
}

const documentsPayload = {
  documents: [
    {
      id: "doc-1",
      title: "Lease Agreement",
      status: "signed",
      updated_at: "2024-06-12T09:00:00.000Z",
      tenant_id: "tenant-1",
    },
    {
      id: "doc-2",
      title: "Move-in Checklist",
      status: "pending_signature",
      updated_at: "2024-06-18T17:30:00.000Z",
      tenant_id: "tenant-2",
    },
  ],
  meta: {
    count: 2,
    latestUpdatedAt: "2024-06-18T17:30:00.000Z",
    revision: "current",
  },
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ""
    request.setEncoding("utf8")
    request.on("data", (chunk) => {
      data += chunk
    })
    request.on("end", () => resolve(data))
    request.on("error", reject)
  })
}

async function parseJsonBody(request: IncomingMessage) {
  const raw = await readBody(request)
  if (!raw) return undefined
  try {
    return JSON.parse(raw)
  } catch (error) {
    console.warn("Failed to parse mock request body", error)
    return undefined
  }
}

export async function startMockServer(): Promise<MockServer> {
  const calls: MockCall[] = []
  let baseUrl = "http://127.0.0.1"

  const server = http.createServer((req, res) => {
    void handleRequest(req, res)
  })

  const handleRequest = async (req: IncomingMessage, res: ServerResponse<IncomingMessage>) => {
    const method = req.method ?? "GET"
    const requestUrl = new URL(req.url ?? "/", baseUrl)
    const path = requestUrl.pathname
    const query = Object.fromEntries(requestUrl.searchParams.entries())

    if (method === "GET" && path === "/api/documents") {
      calls.push({ method, path, query, headers: req.headers })
      res.statusCode = 200
      res.setHeader("Content-Type", "application/json")
      res.end(JSON.stringify(documentsPayload))
      return
    }

    if (method === "POST" && path === "/api/stripe/checkout") {
      const body = await parseJsonBody(req)
      calls.push({ method, path, query, headers: req.headers, body })
      const response = {
        id: "cs_mock_123",
        url: `${baseUrl}/checkout/${body?.priceId ?? "unknown"}`,
      }
      res.statusCode = 200
      res.setHeader("Content-Type", "application/json")
      res.end(JSON.stringify(response))
      return
    }

    if (method === "POST" && path === "/api/notifications") {
      const body = await parseJsonBody(req)
      calls.push({ method, path, query, headers: req.headers, body })
      if (body && typeof body === "object" && (body as any).type === "bulk") {
        const notifications = Array.isArray((body as any).notifications)
          ? (body as any).notifications
          : []
        const results = notifications.map((_, index) => ({ index, success: true }))
        res.statusCode = 200
        res.setHeader("Content-Type", "application/json")
        res.end(JSON.stringify({ success: true, results }))
        return
      }

      res.statusCode = 200
      res.setHeader("Content-Type", "application/json")
      res.end(JSON.stringify({ success: true, data: { channel: (body as any)?.type ?? "unknown" } }))
      return
    }

    res.statusCode = 404
    res.setHeader("Content-Type", "application/json")
    res.end(
      JSON.stringify({
        error: "Not Found",
        path,
        method,
      })
    )
  }

  return await new Promise<MockServer>((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject)
      const address = server.address()
      if (!address || typeof address === "string") {
        reject(new Error("Mock server failed to bind"))
        return
      }
      baseUrl = `http://127.0.0.1:${(address as AddressInfo).port}`
      resolve({
        baseUrl,
        calls,
        close: () =>
          new Promise<void>((closeResolve) => {
            server.close(() => closeResolve())
          }),
        clearCalls: () => {
          calls.splice(0, calls.length)
        },
      })
    })
  })
}
