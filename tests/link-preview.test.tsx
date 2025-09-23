import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

import { POST as linkPreviewHandler } from "@/app/api/link-preview/route"
import { LinkPreviewCard } from "@/components/messaging/link-preview-card"
import type { LinkPreviewData } from "@/types/link-preview"

describe("link preview API route", () => {
  const originalFetch = global.fetch

  const resetCache = () => {
    const globalWithCache = globalThis as unknown as {
      __linkPreviewCache?: Map<string, { data: LinkPreviewData; expiresAt: number }>
    }
    globalWithCache.__linkPreviewCache?.clear()
  }

  beforeEach(() => {
    resetCache()
  })

  afterEach(() => {
    global.fetch = originalFetch
    resetCache()
    vi.restoreAllMocks()
  })

  const createRequest = (url: string) =>
    new Request("http://localhost/api/link-preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    })

  it("sanitizes assets and caches responses", async () => {
    const html = `<!DOCTYPE html>
      <html>
        <head>
          <meta property="og:title" content="Sample Article" />
          <meta property="og:description" content="Summary of the article" />
          <meta property="og:image" content="/assets/og.jpg" />
          <meta property="og:site_name" content="Example Site" />
          <link rel="icon" href="/favicon.ico" />
        </head>
        <body>Example content</body>
      </html>`

    const fetchSpy = vi.fn(async () =>
      new Response(html, {
        status: 200,
        headers: {
          "content-type": "text/html",
        },
      })
    )

    global.fetch = fetchSpy as typeof fetch

    const request = createRequest("https://example.com/story")
    const response = await linkPreviewHandler(request)
    const payload = (await response.json()) as {
      preview: LinkPreviewData
      cached: boolean
    }

    expect(payload.cached).toBe(false)
    expect(payload.preview.title).toBe("Sample Article")
    expect(payload.preview.image).toBe("https://example.com/assets/og.jpg")
    expect(payload.preview.favicon).toBe("https://example.com/favicon.ico")
    expect(payload.preview.siteName).toBe("Example Site")
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    const cachedResponse = await linkPreviewHandler(createRequest("https://example.com/story"))
    const cachedPayload = (await cachedResponse.json()) as {
      preview: LinkPreviewData
      cached: boolean
    }

    expect(cachedPayload.cached).toBe(true)
    expect(cachedPayload.preview.image).toBe("https://example.com/assets/og.jpg")
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it("degrades gracefully for unsupported content", async () => {
    const fetchSpy = vi.fn(async () =>
      new Response("Plain text", {
        status: 200,
        headers: {
          "content-type": "text/plain",
        },
      })
    )

    global.fetch = fetchSpy as typeof fetch

    const response = await linkPreviewHandler(
      createRequest("https://files.example.com/report.pdf")
    )
    const payload = (await response.json()) as {
      preview: LinkPreviewData
      cached: boolean
    }

    expect(payload.preview.title).toBeNull()
    expect(payload.preview.image).toBeNull()
    expect(payload.preview.siteName).toBe("files.example.com")
    expect(payload.cached).toBe(false)

    const cachedResponse = await linkPreviewHandler(
      createRequest("https://files.example.com/report.pdf")
    )
    const cachedPayload = (await cachedResponse.json()) as {
      preview: LinkPreviewData
      cached: boolean
    }

    expect(cachedPayload.cached).toBe(true)
    expect(cachedPayload.preview.image).toBeNull()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})

describe("LinkPreviewCard", () => {
  it("renders metadata when available", () => {
    const preview: LinkPreviewData = {
      url: "https://spruceguide.example.com/spring-deep-clean",
      title: "Spring deep clean playbook",
      description:
        "Room-by-room schedule we can follow for the weekend cleanup — perfect for assigning chores.",
      image:
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80",
      favicon: "https://icons.duckduckgo.com/ip3/spruceguide.example.com.ico",
      siteName: "Spruce Guide",
    }

    const markup = renderToStaticMarkup(
      <LinkPreviewCard preview={preview} />
    )

    expect(markup).toContain("Spring deep clean playbook")
    expect(markup).toContain("spruceguide.example.com")
    expect(markup).toContain("Room-by-room schedule we can follow for the weekend cleanup")
  })

  it("falls back when metadata is missing", () => {
    const preview: LinkPreviewData = {
      url: "https://intranet.home-share.local/tasks",
      title: null,
      description: null,
      image: null,
      favicon: null,
      siteName: "intranet.home-share.local",
    }

    const markup = renderToStaticMarkup(
      <LinkPreviewCard preview={preview} />
    )

    expect(markup).toContain("We couldn't load a full preview, but the link is still available.")
    expect(markup).toContain("intranet.home-share.local")
  })
})
