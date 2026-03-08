import { describe, expect, it } from "vitest"

import { sanitizeNextPath } from "@/lib/auth/redirects"

describe("sanitizeNextPath", () => {
  it("defaults to root when value is missing", () => {
    expect(sanitizeNextPath(null)).toBe("/")
    expect(sanitizeNextPath(undefined)).toBe("/")
    expect(sanitizeNextPath("")).toBe("/")
  })

  it("allows known safe paths with optional queries", () => {
    expect(sanitizeNextPath("/dashboard")).toBe("/dashboard")
    expect(sanitizeNextPath("/documents/123"))
      .toBe("/documents/123")
    expect(sanitizeNextPath("/payments?tab=history")).toBe(
      "/payments?tab=history",
    )
  })

  it("rejects absolute URLs", () => {
    expect(sanitizeNextPath("https://malicious.example"))
      .toBe("/")
  })

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeNextPath("//malicious.example"))
      .toBe("/")
  })

  it("rejects attempts at directory traversal", () => {
    expect(sanitizeNextPath("/../dashboard")).toBe("/")
    expect(sanitizeNextPath("/messaging/../admin")).toBe("/")
    expect(sanitizeNextPath("/%2e%2e")).toBe("/")
  })

  it("rejects encoded protocol-relative paths", () => {
    expect(sanitizeNextPath("/%2fmalicious.example"))
      .toBe("/")
  })
})
