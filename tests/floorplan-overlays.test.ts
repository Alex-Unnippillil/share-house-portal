import { describe, expect, it, vi } from "vitest"

import {
  floorplanOverlays,
  getOverlayById,
  navigateToOverlay,
  type OverlayNavigator,
} from "@/lib/floorplan-overlays"

describe("floorplan overlay configuration", () => {
  it("exposes navigation routes for each overlay id", () => {
    const kitchen = getOverlayById("amenity-kitchen")
    const aria = getOverlayById("roommate-aria")

    expect(kitchen?.route).toBe("/bookings?amenity=kitchen")
    expect(aria?.route).toBe("/dashboard/members?member=aria-chen")
  })

  it("links parking overlays to the Cal.com scheduler", () => {
    const parkingOverlays = floorplanOverlays.filter((overlay) => overlay.type === "parking")

    expect(parkingOverlays.length).toBeGreaterThan(0)

    for (const overlay of parkingOverlays) {
      expect(overlay.isExternal).toBe(true)
      expect(() => new URL(overlay.route)).not.toThrow()
      expect(new URL(overlay.route).hostname).toContain("cal.com")
    }
  })

  it("provides tooltip and aria labels for accessibility", () => {
    for (const overlay of floorplanOverlays) {
      expect(overlay.tooltip.trim().length).toBeGreaterThan(0)
      expect(overlay.ariaLabel.trim().length).toBeGreaterThan(0)
    }
  })
})

describe("floorplan overlay navigation", () => {
  it("pushes internal routes through the Next.js router", () => {
    const overlay = getOverlayById("amenity-lounge")
    expect(overlay).toBeDefined()

    const router: OverlayNavigator = {
      push: vi.fn(),
    }
    const openExternal = vi.fn()

    navigateToOverlay(overlay!, router, openExternal)

    expect(router.push).toHaveBeenCalledWith(overlay!.route)
    expect(openExternal).not.toHaveBeenCalled()
  })

  it("opens external Cal.com links in a new tab", () => {
    const overlay = getOverlayById("parking-a")
    expect(overlay).toBeDefined()

    const router: OverlayNavigator = {
      push: vi.fn(),
    }
    const openExternal = vi.fn()

    navigateToOverlay(overlay!, router, openExternal)

    expect(router.push).not.toHaveBeenCalled()
    expect(openExternal).toHaveBeenCalledWith(overlay!.route)
  })
})
