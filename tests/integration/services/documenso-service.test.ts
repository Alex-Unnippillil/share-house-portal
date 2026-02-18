import { afterEach, describe, expect, it, vi } from "vitest"

import { createLeaseSigningRequest } from "@/lib/documenso"

describe("Documenso signing workflow payloads", () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it("creates a lease envelope and returns first recipient signing URL", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "upload-1", documentDataId: "doc-data-1" }), {
          status: 200,
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "env-1",
            title: "lease-2026",
            status: "pending",
            recipients: [
              {
                id: "recipient-1",
                email: "roommate@example.com",
                role: "SIGNER",
                token: "token-1",
                status: "pending",
              },
            ],
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ signingUrl: "https://documenso.test/sign/recipient-1" }), {
          status: 200,
        })
      ) as typeof fetch

    const file = new File(["lease"], "lease.pdf", { type: "application/pdf" })

    const response = await createLeaseSigningRequest({
      document_id: "lease-2026",
      file,
      tenantEmails: ["roommate@example.com"],
      tenantNames: ["Room Mate"],
      expires_in_days: 7,
      message: "Please sign before move-in.",
    })

    expect(response).toMatchObject({
      success: true,
      envelope_id: "env-1",
      signing_url: "https://documenso.test/sign/recipient-1",
    })
  })

  it("returns an error shape when Documenso rejects the upload", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(new Response("bad request", { status: 400 })) as typeof fetch

    const file = new File(["lease"], "lease.pdf", { type: "application/pdf" })

    const response = await createLeaseSigningRequest({
      document_id: "lease-2026",
      file,
      tenantEmails: ["roommate@example.com"],
    })

    expect(response.success).toBe(false)
    expect(response.error).toContain("temporarily unavailable")
  })
})
