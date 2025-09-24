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
    consumer: "AdminOperationsClient",
    provider: "RoomsilyApi",
    dir: pactOutputDir,
    logLevel: (process.env.PACT_LOG_LEVEL as any) ?? "warn",
  })

describe("Admin operations API contract", () => {
  it("retrieves the revision 2 document snapshot", async () => {
    const provider = createProvider()

    provider
      .given("historical document revisions are available")
      .uponReceiving("a request for revision 2 document snapshot")
      .withRequest({
        method: "GET",
        path: "/api/documents",
        query: {
          revision: "revision2",
        },
      })
      .willRespondWith({
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ETag: MatchersV3.regex(/^W\/\"[A-Za-z0-9_-]+\"$/, "W/\"WFeTw7LsWlPoUr8MVZOLWidV5Os\""),
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
            3
          ),
          meta: {
            count: MatchersV3.integer(3),
            latestUpdatedAt: MatchersV3.datetime(
              "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
              "2024-07-04T08:15:00.000Z"
            ),
            revision: MatchersV3.like("revision2"),
          },
        },
      })

    await provider.executeTest(async (mockServer) => {
      const response = await fetch(
        `${mockServer.url}/api/documents?revision=revision2`
      )

      expect(response.status).toBe(200)
      expect(response.headers.get("etag")).toMatch(/^W\/\"[A-Za-z0-9_-]+\"$/)

      const payload = await response.json()
      expect(payload.meta.revision).toBe("revision2")
      expect(payload.documents.length).toBeGreaterThanOrEqual(3)
    })
  })

  it("allows conditional fetches for administrative review", async () => {
    const provider = createProvider()
    const cachedEtag = "W/\"WFeTw7LsWlPoUr8MVZOLWidV5Os\""

    provider
      .given("historical document revisions are available")
      .uponReceiving("an admin conditional request for revision 2")
      .withRequest({
        method: "GET",
        path: "/api/documents",
        query: {
          revision: "revision2",
        },
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
      const response = await fetch(
        `${mockServer.url}/api/documents?revision=revision2`,
        {
          headers: {
            "If-None-Match": cachedEtag,
          },
        }
      )

      expect(response.status).toBe(304)
      expect(response.headers.get("etag")).toBe(cachedEtag)
    })
  })
})
