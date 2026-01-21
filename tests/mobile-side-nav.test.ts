import { describe, expect, it } from "vitest"

import {
  MOBILE_NAV_ITEMS,
  MOBILE_TOUCH_TARGET_CLASSNAMES,
  MOBILE_TOUCH_TARGET_MIN_HEIGHT,
} from "@/app/dashboard/components/mobile-nav.config"

const expectedRoutes = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Payments", href: "/payments" },
  { label: "Messaging", href: "/messaging" },
  { label: "Schedule", href: "/schedule" },
  { label: "Profile", href: "/account" },
]

describe("mobile bottom navigation", () => {
  it("maps the key resident workflows", () => {
    expect(MOBILE_NAV_ITEMS).toHaveLength(expectedRoutes.length)

    for (const route of expectedRoutes) {
      expect(MOBILE_NAV_ITEMS).toContainEqual(
        expect.objectContaining(route),
      )
    }
  })

  it("meets WCAG touch target sizing for small screens", () => {
    expect(MOBILE_TOUCH_TARGET_MIN_HEIGHT).toBeGreaterThanOrEqual(44)
  })

  it("applies utility classes that enforce touch target height", () => {
    expect(MOBILE_TOUCH_TARGET_CLASSNAMES.split(" ")).toEqual(
      expect.arrayContaining(["h-12", "min-h-[48px]"]),
    )
  })
})
