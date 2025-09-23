import type { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  authenticatePaymentRequestMock,
  stripeCheckoutCreateMock,
  stripeBillingPortalCreateMock,
  getStripeMock,
  getAppBaseUrlMock,
} = vi.hoisted(() => {
  const authenticatePaymentRequestMock = vi.fn()
  const stripeCheckoutCreateMock = vi.fn()
  const stripeBillingPortalCreateMock = vi.fn()
  const getStripeMock = vi.fn(() => ({
    checkout: { sessions: { create: stripeCheckoutCreateMock } },
    billingPortal: { sessions: { create: stripeBillingPortalCreateMock } },
  }))
  const getAppBaseUrlMock = vi.fn(() => "http://localhost:3000")

  return {
    authenticatePaymentRequestMock,
    stripeCheckoutCreateMock,
    stripeBillingPortalCreateMock,
    getStripeMock,
    getAppBaseUrlMock,
  }
})

vi.mock("@/lib/payments/permissions", () => ({
  authenticatePaymentRequest: authenticatePaymentRequestMock,
}))

vi.mock("@/lib/stripe", () => ({
  getStripe: getStripeMock,
  getAppBaseUrl: getAppBaseUrlMock,
}))

import { POST as checkoutPost } from "@/app/api/stripe/checkout/route"
import { POST as billingPortalPost } from "@/app/api/stripe/billing-portal/route"
import { POST as receiptPost } from "@/app/api/payments/receipt/route"

describe("payment API guards", () => {
  beforeEach(() => {
    authenticatePaymentRequestMock.mockReset()
    stripeCheckoutCreateMock.mockReset()
    stripeBillingPortalCreateMock.mockReset()
    getStripeMock.mockClear()
    getAppBaseUrlMock.mockClear()
  })

  it("propagates unauthorized responses from the checkout guard", async () => {
    const unauthorizedResponse = Response.json({ error: "Unauthorized" }, {
      status: 401,
    })
    authenticatePaymentRequestMock.mockResolvedValueOnce({
      success: false,
      response: unauthorizedResponse,
    })

    const jsonMock = vi.fn()
    const request = { json: jsonMock } as unknown as NextRequest
    const response = await checkoutPost(request)

    expect(response).toBe(unauthorizedResponse)
    expect(getStripeMock).not.toHaveBeenCalled()
    expect(jsonMock).not.toHaveBeenCalled()
  })

  it("propagates forbidden responses from the checkout guard", async () => {
    const forbiddenResponse = Response.json({ error: "Forbidden" }, { status: 403 })
    authenticatePaymentRequestMock.mockResolvedValueOnce({
      success: false,
      response: forbiddenResponse,
    })

    const jsonMock = vi.fn()
    const request = { json: jsonMock } as unknown as NextRequest
    const response = await checkoutPost(request)

    expect(response).toBe(forbiddenResponse)
    expect(getStripeMock).not.toHaveBeenCalled()
    expect(jsonMock).not.toHaveBeenCalled()
  })

  it("prevents billing portal access when authentication fails", async () => {
    const unauthorizedResponse = Response.json({ error: "Unauthorized" }, {
      status: 401,
    })
    authenticatePaymentRequestMock.mockResolvedValueOnce({
      success: false,
      response: unauthorizedResponse,
    })

    const jsonMock = vi.fn()
    const request = { json: jsonMock } as unknown as NextRequest
    const response = await billingPortalPost(request)

    expect(response).toBe(unauthorizedResponse)
    expect(getStripeMock).not.toHaveBeenCalled()
    expect(jsonMock).not.toHaveBeenCalled()
  })

  it("prevents receipt generation when authentication fails", async () => {
    const unauthorizedResponse = Response.json({ error: "Unauthorized" }, {
      status: 401,
    })
    authenticatePaymentRequestMock.mockResolvedValueOnce({
      success: false,
      response: unauthorizedResponse,
    })

    const jsonMock = vi.fn()
    const request = { json: jsonMock } as unknown as Request
    const response = await receiptPost(request)

    expect(response).toBe(unauthorizedResponse)
    expect(jsonMock).not.toHaveBeenCalled()
  })
})
