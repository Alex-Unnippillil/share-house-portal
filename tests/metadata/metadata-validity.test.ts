import { describe, expect, it } from "vitest"

import { metadata, viewport } from "@/app/site-metadata"

describe("site metadata", () => {
  it("uses valid BCP-47 language tags", () => {
    const languages = metadata.alternates?.languages

    expect(languages).toBeDefined()

    for (const locale of Object.keys(languages ?? {})) {
      expect(() => new Intl.Locale(locale)).not.toThrow()
      expect(locale).toMatch(/^[a-z]{2,3}-[A-Z]{2}$/)
    }
  })

  it("keeps locale path mappings aligned with language tags", () => {
    const languages = metadata.alternates?.languages ?? {}

    for (const [locale, href] of Object.entries(languages)) {
      expect(href).toBe(`/${locale}`)
    }
  })

  it("keeps robots and googleBot index/follow directives consistent", () => {
    const robots = metadata.robots

    expect(robots).toBeDefined()
    expect(robots?.googleBot).toBeDefined()

    if (
      typeof robots?.index === "boolean" &&
      typeof robots?.follow === "boolean" &&
      robots.googleBot &&
      typeof robots.googleBot.index === "boolean" &&
      typeof robots.googleBot.follow === "boolean"
    ) {
      expect(robots.googleBot.index).toBe(robots.index)
      expect(robots.googleBot.follow).toBe(robots.follow)
    }
  })
})

describe("viewport accessibility", () => {
  it("does not disable pinch zoom", () => {
    expect(viewport.maximumScale).toBeUndefined()
    expect(viewport.userScalable).toBeUndefined()
  })

  it("uses responsive defaults for mobile browsers", () => {
    expect(viewport.width).toBe("device-width")
    expect(viewport.initialScale).toBe(1)
  })
})
