import { describe, expect, it } from "vitest"

import { canAccessReceipt, canManageReceipt, isAdmin } from "@/lib/authorization/receipts"

const payerId = "00000000-0000-0000-0000-000000000111"
const otherId = "00000000-0000-0000-0000-000000000222"

describe("receipt access control", () => {
  it("treats administrators as privileged viewers", () => {
    const adminProfile = { id: otherId, role: "admin" }

    expect(isAdmin(adminProfile)).toBe(true)
    expect(canAccessReceipt(payerId, adminProfile)).toBe(true)
    expect(canManageReceipt(payerId, adminProfile)).toBe(true)
  })

  it("allows the payer to upload or view receipts", () => {
    const payerProfile = { id: payerId, role: "resident" }

    expect(canAccessReceipt(payerId, payerProfile)).toBe(true)
    expect(canManageReceipt(payerId, payerProfile)).toBe(true)
  })

  it("blocks roommates who are not administrators", () => {
    const roommateProfile = { id: otherId, role: "resident" }

    expect(canAccessReceipt(payerId, roommateProfile)).toBe(false)
    expect(canManageReceipt(payerId, roommateProfile)).toBe(false)
  })

  it("handles missing profile contexts", () => {
    expect(canAccessReceipt(payerId, null)).toBe(false)
    expect(canManageReceipt(payerId, undefined)).toBe(false)
  })
})
