import { describe, expect, it } from "vitest"

import { formatDate, formatRelativeTimeFromNow } from "@/lib/utils"
import { formatCurrency } from "@/lib/payments/currency"

describe("formatting utilities honor locale and timezone overrides", () => {
  it("adjusts dates when a different timezone is provided", () => {
    const iso = "2024-06-01T02:00:00.000Z"

    const pacific = formatDate(iso, {
      locale: "en-US",
      timeZone: "America/Los_Angeles",
      month: "long",
      day: "numeric",
      year: "numeric",
    })

    const tokyo = formatDate(iso, {
      locale: "ja-JP",
      timeZone: "Asia/Tokyo",
      month: "long",
      day: "numeric",
      year: "numeric",
    })

    expect(pacific).toBe("May 31, 2024")
    expect(tokyo).toBe("2024年6月1日")
    expect(pacific).not.toEqual(tokyo)
  })

  it("formats currency using the supplied locale", () => {
    const usFormatted = formatCurrency(1234.56, "USD", { locale: "en-US" })
    const germanFormatted = formatCurrency(1234.56, "EUR", { locale: "de-DE" })

    expect(usFormatted).toBe("$1,234.56")
    expect(germanFormatted).toBe("1.234,56 €")
    expect(usFormatted).not.toEqual(germanFormatted)
  })

  it("renders relative time strings using the requested locale", () => {
    const reference = new Date("2024-06-01T00:00:00Z").getTime()

    const english = formatRelativeTimeFromNow("2024-06-03T00:00:00Z", {
      locale: "en-US",
      now: reference,
      numeric: "always",
    })
    const french = formatRelativeTimeFromNow("2024-06-03T00:00:00Z", {
      locale: "fr-FR",
      now: reference,
      numeric: "always",
    })

    expect(english).toBe("in 2 days")
    expect(french.toLowerCase()).toContain("jours")
    expect(english).not.toEqual(french)
  })
})
