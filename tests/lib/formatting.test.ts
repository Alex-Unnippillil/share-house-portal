import { describe, expect, it } from "vitest"

import { formatCurrency } from "@/lib/payments/currency"
import { formatDate } from "@/lib/utils"

describe("formatCurrency", () => {
  it("uses default user settings when no overrides are provided", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50")
  })

  it("formats amounts according to the provided locale and currency", () => {
    expect(formatCurrency(1234.5, { currency: "EUR", locale: "de-DE" })).toBe("1.234,50 €")
  })
})

describe("formatDate", () => {
  const sampleDate = new Date(Date.UTC(2024, 0, 15, 12, 0, 0))

  it("returns a localized long date string by default", () => {
    expect(formatDate(sampleDate)).toBe("January 15, 2024")
  })

  it("respects custom locales when provided", () => {
    expect(formatDate(sampleDate, { locale: "fr-FR" })).toBe("15 janvier 2024")
  })

  it("supports custom format options including time styles", () => {
    const formatted = formatDate(sampleDate, {
      locale: "en-GB",
      formatOptions: { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" },
    })

    expect(formatted).toBe("15 Jan 2024, 12:00")
  })
})
