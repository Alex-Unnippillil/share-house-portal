import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { GET as getDocuments } from "@/app/api/documents/route"
import { POST as sendReceipt } from "@/app/api/payments/receipt/route"

const resendMock = vi.fn(async () => ({ data: { id: "mocked" }, error: null }))

vi.mock("resend", () => {
  return {
    Resend: class {
      emails = {
        send: resendMock,
      }
    },
  }
})

describe("Server-Timing instrumentation", () => {
  const originalResendApiKey = process.env.RESEND_API_KEY

  beforeEach(() => {
    resendMock.mockClear()
  })

  afterEach(() => {
    process.env.RESEND_API_KEY = originalResendApiKey
  })

  it("adds Server-Timing header to document listing", async () => {
    const request = new Request("http://localhost/api/documents")
    const response = await getDocuments(request)

    const header = response.headers.get("Server-Timing")
    expect(header).toBeTruthy()
    expect(header).toMatch(/app\d*;dur=/)
  })

  it("tracks external email service timing", async () => {
    process.env.RESEND_API_KEY = "test-key"

    const payload = {
      customerEmail: "tenant@example.com",
      customerName: "Roomsily Resident",
      paymentId: "pay_123",
      amountPaid: 1200,
      currency: "usd",
    }

    const request = new Request("http://localhost/api/payments/receipt", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "content-type": "application/json",
      },
    })

    const response = await sendReceipt(request)

    expect(response.status).toBe(200)
    expect(resendMock).toHaveBeenCalled()

    const header = response.headers.get("Server-Timing")
    expect(header).toBeTruthy()
    expect(header).toMatch(/ext\d*;dur=.*resend\.emails\.send/)
  })
})
