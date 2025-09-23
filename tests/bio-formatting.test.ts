import { describe, expect, it } from "vitest"

import { bioHtmlToMarkdown, renderBioMarkdown, sanitizeBioHtml } from "@/lib/bio"

describe("bio formatting", () => {
  it("converts markdown bold, italic, and code to sanitized HTML", () => {
    const html = renderBioMarkdown("**bold** _italic_ `code`")

    expect(html).toContain("<strong>bold</strong>")
    expect(html).toContain("<em>italic</em>")
    expect(html).toContain("<code>code</code>")
  })

  it("normalizes editor HTML back to markdown markers", () => {
    const markdown = bioHtmlToMarkdown("<p><strong>bold</strong> and <em>italic</em> with <code>code</code></p>")

    expect(markdown).toContain("**bold**")
    expect(markdown).toContain("_italic_")
    expect(markdown).toContain("`code`")
  })

  it("sanitizes unwanted HTML while preserving formatting", () => {
    const html = renderBioMarkdown("Hello<script>alert('xss')</script> **bold**")

    expect(html).not.toContain("<script")
    expect(html).toContain("<strong>bold</strong>")
  })

  it("removes unsafe link protocols", () => {
    const sanitized = sanitizeBioHtml('<p><a href="javascript:alert(1)">click me</a></p>')

    expect(sanitized).not.toContain("href=\"javascript")
  })
})
