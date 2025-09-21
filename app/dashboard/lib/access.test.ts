import { randomUUID } from "crypto"
import { describe, expect, it } from "vitest"

import { canViewWidget, getAccessibleWidgets } from "./access"
import { filterDataByRole } from "./data"
import type { DashboardData, RentPaymentRow } from "./types"

const rentPayment: RentPaymentRow = {
  id: randomUUID(),
  building_id: "bldg-1",
  created_at: new Date().toISOString(),
  due_date: new Date().toISOString(),
  amount_due: 1000,
  amount_paid: 1000,
  lease_id: null,
  paid_at: new Date().toISOString(),
  status: "paid",
  tenant_id: "tenant-1",
  unit_id: "1A",
  updated_at: null,
}

const baseData: DashboardData = {
  rentPayments: [rentPayment],
  bookings: [],
  maintenance: [],
  visitors: [],
  documents: [],
  messages: [],
}

describe("dashboard access control", () => {
  it("exposes widget matrix for property managers", () => {
    const widgets = getAccessibleWidgets("property_manager")
    expect(widgets).toContain("rent")
    expect(widgets).toContain("maintenance")
    expect(widgets).toContain("messages")
  })

  it("restricts residents from viewing admin widgets", () => {
    expect(canViewWidget("resident", "rent")).toBe(false)
    expect(canViewWidget("resident", "messages")).toBe(false)
  })

  it("filters dataset for building staff", () => {
    const filtered = filterDataByRole(baseData, "building_staff")
    expect(filtered.rentPayments).toHaveLength(0)
    expect(filtered.maintenance).toHaveLength(0)
    expect(filtered.bookings).toHaveLength(0)
  })
})

