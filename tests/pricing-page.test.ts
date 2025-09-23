import React from "react"
import { describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

vi.mock("@/components/navigation/SmartLink", () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: any) =>
    React.createElement(
      "a",
      {
        href: typeof href === "string" ? href : String(href),
        ...rest,
      },
      children
    ),
}))

import PricingPage from "@/app/pricing/page"
import {
  PRICING_FEATURE_MATRIX,
  PRICING_PLANS,
} from "@/config/pricing"
import { createCheckoutSession } from "@/app/pricing/_components/upgrade-button"

describe("pricing experience", () => {
  it("renders plan copy and feature sections from configuration", () => {
    const markup = renderToStaticMarkup(PricingPage())

    for (const plan of PRICING_PLANS) {
      expect(markup).toContain(plan.name)
      expect(markup).toContain(plan.ctaLabel)
    }

    for (const section of PRICING_FEATURE_MATRIX) {
      for (const feature of section.features) {
        const encodedLabel = feature.label.replace(/&/g, "&amp;")
        expect(markup).toContain(encodedLabel)
      }
    }
  })

  it("starts a Stripe checkout session with plan metadata", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ url: "https://stripe.test/checkout" }),
    }))

    const result = await createCheckoutSession(
      { priceId: "price_test", planId: "plus", planName: "Roommate Plus" },
      fetchMock as unknown as typeof fetch
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [
      RequestInfo | URL,
      RequestInit
    ]

    expect(url).toBe("/api/stripe/checkout")
    expect(init?.method).toBe("POST")
    expect(init?.headers).toEqual({ "Content-Type": "application/json" })
    expect(JSON.parse((init?.body as string) ?? "{}")).toEqual({
      priceId: "price_test",
      quantity: 1,
      mode: "subscription",
      metadata: {
        plan_id: "plus",
        plan_name: "Roommate Plus",
      },
    })
    expect(result.url).toBe("https://stripe.test/checkout")
  })

  it("surfaces Stripe errors when checkout cannot be created", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: "Stripe unavailable" }),
    }))

    await expect(
      createCheckoutSession(
        { priceId: "price_bad", planId: "plus", planName: "Roommate Plus" },
        fetchMock as unknown as typeof fetch
      )
    ).rejects.toThrow(/Stripe unavailable/)
  })
})
