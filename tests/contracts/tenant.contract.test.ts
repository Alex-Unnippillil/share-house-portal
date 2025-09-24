import { describe, expect, it } from "vitest"
import { MatchersV3, PactV3 } from "@pact-foundation/pact"
import { fileURLToPath } from "node:url"
import path from "node:path"

const pactOutputDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "pacts"
)

const statusMatcher = MatchersV3.regex(
  "^(draft|pending_signature|signed|expired|cancelled)$",
  "signed"
)

const createProvider = () =>
  new PactV3({
    consumer: "TenantPortalClient",
    provider: "RoomsilyApi",
    dir: pactOutputDir,
    logLevel: (process.env.PACT_LOG_LEVEL as any) ?? "warn",
  })

describe("Tenant portal API contract", () => {
  it("retrieves the tenant document feed", async () => {
    const provider = createProvider()

    provider
      .given("documents exist for tenant view")
      .uponReceiving("a request for the tenant documents feed")
      .withRequest({
        method: "GET",
        path: "/api/documents",
      })
      .willRespondWith({
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ETag: MatchersV3.regex(/^W\/\"[A-Za-z0-9_-]+\"$/, "W/\"khHbYwxUZ6AGXh5fUoFwyOpeVMU\""),
        },
        body: {
          documents: MatchersV3.eachLike(
            {
              id: MatchersV3.like("doc-1"),
              title: MatchersV3.like("Lease Agreement"),
              status: statusMatcher,
              updated_at: MatchersV3.datetime(
                "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
                "2024-06-12T09:00:00.000Z"
              ),
              tenant_id: MatchersV3.like("tenant-1"),
            },
            1
          ),
          meta: {
            count: MatchersV3.integer(2),
            latestUpdatedAt: MatchersV3.datetime(
              "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
              "2024-06-18T17:30:00.000Z"
            ),
            revision: MatchersV3.like("current"),
          },
        },
      })

    await provider.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/api/documents`)
      expect(response.status).toBe(200)
      expect(response.headers.get("etag")).toMatch(/^W\/\"[A-Za-z0-9_-]+\"$/)

      const payload = await response.json()
      expect(payload.meta.revision).toBe("current")
      expect(payload.documents.length).toBeGreaterThan(0)
    })
  })

  it("supports conditional requests using If-None-Match", async () => {
    const provider = createProvider()
    const cachedEtag = "W/\"khHbYwxUZ6AGXh5fUoFwyOpeVMU\""

    provider
      .given("documents exist for tenant view")
      .uponReceiving("a conditional documents request with a matching ETag")
      .withRequest({
        method: "GET",
        path: "/api/documents",
        headers: {
          "If-None-Match": cachedEtag,
        },
      })
      .willRespondWith({
        status: 304,
        headers: {
          ETag: MatchersV3.regex(/^W\/\"[A-Za-z0-9_-]+\"$/, cachedEtag),
        },
      })

    await provider.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/api/documents`, {
        headers: {
          "If-None-Match": cachedEtag,
        },
      })

      expect(response.status).toBe(304)
      expect(response.headers.get("etag")).toBe(cachedEtag)
    })
  })
})
