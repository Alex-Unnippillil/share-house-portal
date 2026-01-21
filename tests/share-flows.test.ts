import { describe, expect, it, vi } from "vitest"

import { POST } from "@/app/share/route"
import { shareLink } from "@/utils/share"

describe("share flows", () => {
  it("uses navigator.share when available", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined)
    const canShareMock = vi.fn(() => true)
    const writeTextMock = vi.fn().mockResolvedValue(undefined)

    const outcome = await shareLink({
      shareData: { title: "Lease", url: "https://example.com/lease.pdf" },
      fallbackValue: "https://example.com/lease.pdf",
      navigatorOverride: {
        share: shareMock,
        canShare: canShareMock,
        clipboard: { writeText: writeTextMock },
      },
    })

    expect(outcome).toBe("shared")
    expect(shareMock).toHaveBeenCalledWith({
      title: "Lease",
      url: "https://example.com/lease.pdf",
    })
    expect(writeTextMock).not.toHaveBeenCalled()
  })

  it("falls back to copying when share fails", async () => {
    const shareMock = vi.fn().mockRejectedValue(new Error("share unsupported"))
    const writeTextMock = vi.fn().mockResolvedValue(undefined)

    const outcome = await shareLink({
      shareData: { title: "Lease", url: "https://example.com/lease.pdf" },
      fallbackValue: "https://example.com/lease.pdf",
      navigatorOverride: {
        share: shareMock,
        canShare: () => true,
        clipboard: { writeText: writeTextMock },
      },
    })

    expect(outcome).toBe("copied")
    expect(writeTextMock).toHaveBeenCalledWith("https://example.com/lease.pdf")
  })

  it("redirects document shares to the documents flow", async () => {
    const form = new FormData()
    form.set("title", "Shared Lease")
    form.set("text", "Lease agreement for Unit 3B")
    form.set("url", "https://example.com/lease.pdf")
    form.append("documents", new File(["dummy"], "lease.pdf", { type: "application/pdf" }))

    const request = new Request("https://roomsily.test/share", {
      method: "POST",
      body: form,
    })

    const response = await POST(request)
    const location = response.headers.get("location")
    expect(location).toBeTruthy()

    const redirectUrl = new URL(location ?? "", "https://roomsily.test")
    expect(redirectUrl.pathname).toBe("/documents")
    expect(redirectUrl.searchParams.get("shareIntent")).toBe("document")
    expect(redirectUrl.searchParams.get("shareTitle")).toBe("Shared Lease")
    expect(redirectUrl.searchParams.get("shareDescription")).toBe("Lease agreement for Unit 3B")
    expect(redirectUrl.searchParams.get("shareFileName")).toBe("lease.pdf")
  })

  it("redirects calendar shares to the booking flow", async () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "SUMMARY:Kitchen Reservation",
      "DTSTART:20240601T180000Z",
      "DTEND:20240601T190000Z",
      "DESCRIPTION:Reserve the kitchen for dinner",
      "LOCATION:Kitchen",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n")

    const form = new FormData()
    form.set("title", "Kitchen Reservation")
    form.append("calendar", new File([ics], "booking.ics", { type: "text/calendar" }))

    const request = new Request("https://roomsily.test/share", {
      method: "POST",
      body: form,
    })

    const response = await POST(request)
    const location = response.headers.get("location")
    expect(location).toBeTruthy()

    const redirectUrl = new URL(location ?? "", "https://roomsily.test")
    expect(redirectUrl.pathname).toBe("/bookings")
    expect(redirectUrl.searchParams.get("shareIntent")).toBe("booking")
    expect(redirectUrl.searchParams.get("shareAmenity")).toBe("kitchen")
    expect(redirectUrl.searchParams.get("shareStart")).toBe("2024-06-01T18:00:00.000Z")
    expect(redirectUrl.searchParams.get("shareEnd")).toBe("2024-06-01T19:00:00.000Z")
  })
})
