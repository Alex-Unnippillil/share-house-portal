import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

import { fetchLinkPreview } from "@/app/messaging/actions"
import { LinkPreviewCard } from "@/components/messaging/link-preview-card"
import {
  clearLinkPreviewStore,
  createFallbackPreview,
  getLinkPreview,
} from "@/lib/messaging/link-previews"

const originalFetch = global.fetch

describe("messaging link previews", () => {
  beforeEach(() => {
    clearLinkPreviewStore()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
    clearLinkPreviewStore()
  })

  it("fetches and stores Open Graph metadata for supported URLs", async () => {
    const html = `<!doctype html>
      <html>
        <head>
          <meta property="og:title" content="Spring deep clean checklist" />
          <meta property="og:description" content="Room-by-room instructions, supplies, and timing." />
          <meta property="og:image" content="https://househandbook.example.com/assets/deep-clean.jpg" />
          <meta property="og:url" content="https://househandbook.example.com/checklists/spring-deep-clean" />
          <meta property="og:site_name" content="House Handbook" />
          <link rel="icon" href="https://househandbook.example.com/favicon.ico" />
        </head>
      </html>`

    global.fetch = vi.fn(async () => new Response(html, { status: 200 })) as typeof fetch

    const preview = await fetchLinkPreview("https://househandbook.example.com/checklists/spring-deep-clean")

    expect(preview.status).toBe("ready")
    expect(preview.title).toBe("Spring deep clean checklist")
    expect(preview.description).toContain("Room-by-room")

    const stored = getLinkPreview("https://househandbook.example.com/checklists/spring-deep-clean")
    expect(stored).toEqual(preview)

    const markup = renderToStaticMarkup(<LinkPreviewCard preview={preview} />)
    expect(markup).toContain("Spring deep clean checklist")
    expect(markup).toContain("House Handbook")
    expect(markup).toContain("https://househandbook.example.com/assets/deep-clean.jpg")
  })

  it("returns a graceful fallback when metadata fetch fails", async () => {
    global.fetch = vi.fn(async () => new Response("error", { status: 500 })) as typeof fetch

    const preview = await fetchLinkPreview("https://communitywifi.example.com/installer-tracker")

    expect(preview.status).toBe("error")
    expect(preview.title).toBe("communitywifi.example.com")

    const markup = renderToStaticMarkup(
      <LinkPreviewCard preview={preview} />
    )

    expect(markup).toContain("Preview unavailable")

    const fallbackOnly = createFallbackPreview("https://roommates.example.com/no-preview")
    const fallbackMarkup = renderToStaticMarkup(<LinkPreviewCard preview={fallbackOnly} />)
    expect(fallbackMarkup).toContain("roommates.example.com")
    expect(fallbackMarkup).toContain("Preview unavailable")
  })
})

