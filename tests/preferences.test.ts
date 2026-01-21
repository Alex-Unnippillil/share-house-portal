import { describe, expect, it } from "vitest"

import { createFormatters } from "@/components/preferences/preferences-provider"
import { DEFAULT_LOCALE, DEFAULT_TIMEZONE } from "@/config/preferences"
import { toProfileUpsertInput, type ProfileState } from "@/app/account/supa-account-form"

describe("profile preference persistence", () => {
  it("includes locale and timezone when building the upsert payload", () => {
    const state: ProfileState = {
      fullName: "Jordan",
      username: "jblake",
      website: "https://share.example",
      avatarUrl: "avatar.png",
      email: "jordan@example.com",
      locale: "de-DE",
      timezone: "Europe/Berlin",
    }

    const payload = toProfileUpsertInput(state, "user-123")

    expect(payload).toMatchObject({
      id: "user-123",
      locale: "de-DE",
      timezone: "Europe/Berlin",
    })
  })

  it("falls back to null for optional fields when not provided", () => {
    const state: ProfileState = {
      fullName: "",
      username: "",
      website: "",
      avatarUrl: "",
      email: "jordan@example.com",
      locale: "",
      timezone: "",
    }

    const payload = toProfileUpsertInput(state, "user-456")

    expect(payload.locale).toBeNull()
    expect(payload.timezone).toBeNull()
  })
})

describe("preference-driven formatting", () => {
  it("formats currency values using the provided locale", () => {
    const { formatCurrency } = createFormatters("de-DE", DEFAULT_TIMEZONE)
    const amount = 1234.56
    const expected = new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount)

    expect(formatCurrency(amount, "EUR")).toBe(expected)
  })

  it("formats dates using the provided timezone", () => {
    const { formatDate } = createFormatters(DEFAULT_LOCALE, "Asia/Tokyo")
    const isoString = "2024-01-15T12:00:00Z"
    const expected = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(isoString))

    expect(formatDate(isoString, { year: "numeric", month: "long", day: "numeric" })).toBe(expected)
  })

  it("gracefully recovers from invalid timezones", () => {
    const formatter = createFormatters("en-US", "Mars/Base")

    expect(formatter.timezone).toBeDefined()
    expect(() => formatter.formatDate(new Date())).not.toThrow()
  })
})
