import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { Configuration, DefaultApi } from "../../sdk/typescript"

import { startMockServer, type MockServer } from "./mockServer"

describe("typescript sdk smoke", () => {
  let server: MockServer
  let api: DefaultApi

  beforeAll(async () => {
    server = await startMockServer()
    api = new DefaultApi(new Configuration({ basePath: server.baseUrl }))
  })

  beforeEach(() => {
    server.clearCalls()
  })

  afterAll(async () => {
    await server.close()
  })

  it("lists documents from the mock API", async () => {
    const response = await api.listDocuments()

    expect(response.documents).toHaveLength(2)
    expect(response.meta.count).toBe(2)
    expect(response.meta.revision).toBe("current")

    const call = server.calls.find((entry) => entry.path === "/api/documents")
    expect(call?.method).toBe("GET")
    expect(call?.query).toEqual({})
  })

  it("creates a checkout session", async () => {
    const response = await api.createCheckoutSession({
      checkoutSessionRequest: {
        priceId: "price_ts_123",
        quantity: 2,
        mode: "payment",
      },
    })

    expect(response.id).toBe("cs_mock_123")
    expect(response.url).toContain("/checkout/price_ts_123")

    const checkoutCall = server.calls.find(
      (entry) => entry.path === "/api/stripe/checkout"
    )
    expect(checkoutCall?.body).toMatchObject({ priceId: "price_ts_123", quantity: 2 })
  })
})
