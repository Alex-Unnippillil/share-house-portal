import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeAll, describe, expect, it, vi } from "vitest"

import type { SiteConfig } from "@/config/site"

vi.mock("@/components/navigation/SmartLink", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children?: React.ReactNode; href?: string }) => (
    <a href={typeof href === "string" ? href : "#"} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("@/components/icons", () => ({
  Icons: {
    logo: () => null,
  },
}))

let SiteFooter: (props: { config?: SiteConfig }) => JSX.Element
let defaultConfig: SiteConfig

beforeAll(async () => {
  const [{ SiteFooter: FooterComponent }, { siteConfig }] = await Promise.all([
    import("@/components/site-footer"),
    import("@/config/site"),
  ])

  SiteFooter = FooterComponent
  defaultConfig = siteConfig
})

describe("SiteFooter", () => {
  it("renders roadmap and status links from default configuration", () => {
    const markup = renderToStaticMarkup(<SiteFooter />)

    expect(defaultConfig.links.roadmap).toBeTruthy()
    expect(defaultConfig.links.status).toBeTruthy()
    expect(markup).toContain(defaultConfig.links.roadmap as string)
    expect(markup).toContain(defaultConfig.links.status as string)
  })

  it("supports overriding roadmap and status links", () => {
    const customConfig: SiteConfig = {
      ...defaultConfig,
      links: {
        ...defaultConfig.links,
        roadmap: "https://example.com/roadmap",
        status: "https://status.example.com",
      },
      status: undefined,
    }

    const markup = renderToStaticMarkup(<SiteFooter config={customConfig} />)

    expect(markup).toContain(customConfig.links.roadmap as string)
    expect(markup).toContain(customConfig.links.status as string)

    if (defaultConfig.links.roadmap) {
      expect(markup).not.toContain(defaultConfig.links.roadmap)
    }

    if (defaultConfig.links.status) {
      expect(markup).not.toContain(defaultConfig.links.status)
    }
  })
})
