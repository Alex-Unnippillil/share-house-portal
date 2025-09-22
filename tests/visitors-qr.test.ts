import { describe, expect, it } from "vitest"
import { performance } from "node:perf_hooks"

import {
  VISITOR_QR_VERSION,
  createVisitorQrPayload,
  decodeInviteId,
  encodeInviteId,
  parseVisitorQrPayload,
} from "@/lib/visitors/qr"

describe("visitor QR payload", () => {
  const inviteId = "9c1a2b3c-4d5e-678f-9012-3456789abcde"
  const guestName = "Ada Lovelace"
  const checkInDate = new Date("2025-01-15")
  const checkOutDate = new Date("2025-01-17")

  it("round-trips invite identifiers through Base32", () => {
    const encoded = encodeInviteId(inviteId)
    expect(encoded.length).toBeLessThan(inviteId.length)
    expect(decodeInviteId(encoded)).toBe(inviteId)
  })

  it("creates a compact JSON payload without optional fields", () => {
    const payloadString = createVisitorQrPayload({
      inviteId,
      guestName,
      checkInDate,
      checkOutDate,
    })

    const wirePayload = JSON.parse(payloadString)

    expect(Object.keys(wirePayload).sort()).toEqual(["ci", "co", "g", "i", "v"])
    expect(wirePayload.v).toBe(VISITOR_QR_VERSION)
    expect(typeof wirePayload.i).toBe("string")
    expect(wirePayload.i.length).toBeLessThan(inviteId.length)
    expect(wirePayload.g).toBe(guestName)

    const parsed = parseVisitorQrPayload(payloadString)
    expect(parsed).toEqual({
      version: VISITOR_QR_VERSION,
      inviteId,
      guestName,
      checkInDate: "2025-01-15",
      checkOutDate: "2025-01-17",
    })
  })

  it("parses payloads within 250ms across 1000 scans", () => {
    const payloadString = createVisitorQrPayload({
      inviteId,
      guestName,
      checkInDate,
      checkOutDate,
    })

    const iterations = 1000
    const start = performance.now()
    let lastInviteId: string | null = null

    for (let i = 0; i < iterations; i += 1) {
      lastInviteId = parseVisitorQrPayload(payloadString).inviteId
    }

    const duration = performance.now() - start
    expect(duration).toBeLessThan(250)
    expect(lastInviteId).toBe(inviteId)
  })
})
