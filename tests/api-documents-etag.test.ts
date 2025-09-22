import { beforeEach, describe, expect, it, vi } from "vitest"

import type { DocumentWithLease } from "@/types/documents"

vi.mock("@/lib/server/documents-snapshot", () => ({
  fetchDocumentsForApi: vi.fn(),
}))

import { GET } from "@/app/api/documents/route"
import { fetchDocumentsForApi } from "@/lib/server/documents-snapshot"

const mockedFetchDocuments = vi.mocked(fetchDocumentsForApi)

const createDocument = (overrides: Partial<DocumentWithLease> = {}) => ({
  id: "document-id",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  title: "Lease agreement",
  document_type: "lease",
  status: "signed",
  metadata: {},
  requires_signature: false,
  version: 1,
  ...overrides,
}) satisfies DocumentWithLease

describe("GET /api/documents", () => {
  beforeEach(() => {
    mockedFetchDocuments.mockReset()
  })

  it("returns a 200 response with an ETag header", async () => {
    const documents = [createDocument({ id: "doc-1" })]
    mockedFetchDocuments.mockResolvedValue(documents)

    const response = await GET(new Request("http://localhost/api/documents"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get("ETag")).toBeTruthy()
    expect(body.documents).toEqual(documents)
  })

  it("returns 304 when the If-None-Match header matches", async () => {
    const documents = [createDocument({ id: "doc-2" })]
    mockedFetchDocuments.mockResolvedValue(documents)

    const initialResponse = await GET(new Request("http://localhost/api/documents"))
    const etag = initialResponse.headers.get("ETag")
    expect(etag).toBeTruthy()

    mockedFetchDocuments.mockResolvedValue(documents)

    const conditionalResponse = await GET(
      new Request("http://localhost/api/documents", {
        headers: {
          "If-None-Match": etag ?? "",
        },
      })
    )

    expect(conditionalResponse.status).toBe(304)
    expect(await conditionalResponse.text()).toBe("")
  })

  it("returns a new ETag when document metadata changes", async () => {
    mockedFetchDocuments
      .mockResolvedValueOnce([createDocument({ id: "doc-3", updated_at: "2024-01-02T00:00:00.000Z" })])
      .mockResolvedValueOnce([createDocument({ id: "doc-3", updated_at: "2024-02-15T12:00:00.000Z" })])

    const firstResponse = await GET(new Request("http://localhost/api/documents"))
    const firstTag = firstResponse.headers.get("ETag")
    expect(firstTag).toBeTruthy()

    const secondResponse = await GET(new Request("http://localhost/api/documents"))
    const secondTag = secondResponse.headers.get("ETag")

    expect(secondTag).toBeTruthy()
    expect(secondTag).not.toBe(firstTag)
  })
})
