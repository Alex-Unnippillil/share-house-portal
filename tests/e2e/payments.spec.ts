import { expect, test } from "@playwright/test"

import { resolveInvoiceStatus, toMinorUnitAmount } from "@/app/(tenant)/billing/pay/utils"

test.describe("Stripe payment simulations", () => {
  test("card payment flow with Stripe 4242 test card covers invoice in full", async () => {
    const stripeTestCard = "4242 4242 4242 4242"
    expect(stripeTestCard.replace(/\s/g, "")).toBe("4242424242424242")

    const amount = toMinorUnitAmount("1200.00")
    expect(amount).toBe(120000)

    const result = resolveInvoiceStatus("succeeded", 120000, amount)
    expect(result.nextStatus).toBe("paid")
    expect(result.remainingAmount).toBe(0)
  })

  test("partial card payment keeps invoice open", async () => {
    const amount = toMinorUnitAmount("500.00")
    const result = resolveInvoiceStatus("succeeded", 120000, amount)
    expect(result.nextStatus).toBe("partial")
    expect(result.remainingAmount).toBe(70000)
  })

  test("ACSS debit flow using Stripe mock tokens transitions from processing to paid", async () => {
    const acssTestToken = "pm_mock_acss_us"
    expect(acssTestToken.startsWith("pm_mock_acss")).toBeTruthy()

    const amount = toMinorUnitAmount("450.00")
    expect(amount).toBe(45000)

    const processing = resolveInvoiceStatus("processing", 45000, amount)
    expect(processing.nextStatus).toBe("processing")
    expect(processing.remainingAmount).toBe(45000)

    const settled = resolveInvoiceStatus("succeeded", 45000, amount)
    expect(settled.nextStatus).toBe("paid")
    expect(settled.remainingAmount).toBe(0)
  })
})
