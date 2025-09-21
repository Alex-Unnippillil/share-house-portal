import { randomUUID } from "crypto"
import { describe, expect, it } from "vitest"

import type {
  BookingRow,
  DocumentApprovalRow,
  MaintenanceRequestRow,
  RentPaymentRow,
  VisitorLogRow,
} from "./types"
import {
  calculateRentCollectionSummary,
  selectRecentPayments,
  selectUpcomingBookings,
  summarizeDocumentApprovals,
  summarizeMaintenanceRequests,
  summarizeVisitorApprovals,
} from "./transform"

function rentPayment(overrides: Partial<RentPaymentRow>): RentPaymentRow {
  return {
    id: randomUUID(),
    building_id: "bldg-1",
    created_at: new Date().toISOString(),
    due_date: new Date().toISOString(),
    amount_due: 1500,
    amount_paid: 0,
    lease_id: null,
    paid_at: null,
    status: "pending",
    tenant_id: null,
    unit_id: null,
    updated_at: null,
    ...overrides,
  }
}

function maintenanceRequest(
  overrides: Partial<MaintenanceRequestRow>,
): MaintenanceRequestRow {
  return {
    id: randomUUID(),
    building_id: "bldg-1",
    category: "plumbing",
    priority: "high",
    sla_due_at: null,
    status: "open",
    submitted_at: new Date().toISOString(),
    summary: "Leaky faucet",
    tenant_id: null,
    unit_id: "3A",
    assigned_to: null,
    updated_at: null,
    ...overrides,
  }
}

function visitorLog(overrides: Partial<VisitorLogRow>): VisitorLogRow {
  return {
    id: randomUUID(),
    building_id: "bldg-1",
    visitor_name: "Guest",
    host_id: "tenant-1",
    unit_id: "1A",
    status: "pending",
    arrival_date: new Date().toISOString(),
    departure_date: null,
    created_at: new Date().toISOString(),
    updated_at: null,
    notes: null,
    ...overrides,
  }
}

function documentRow(overrides: Partial<DocumentApprovalRow>): DocumentApprovalRow {
  return {
    id: randomUUID(),
    building_id: "bldg-1",
    document_title: "Lease addendum",
    requested_at: new Date().toISOString(),
    requester_id: "manager-1",
    approver_id: null,
    status: "pending",
    due_at: null,
    envelope_id: null,
    updated_at: null,
    ...overrides,
  }
}

function bookingRow(overrides: Partial<BookingRow>): BookingRow {
  return {
    id: randomUUID(),
    building_id: "bldg-1",
    amenity_id: "gym",
    tenant_id: "tenant-1",
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    status: "confirmed",
    created_at: new Date().toISOString(),
    updated_at: null,
    title: "Gym session",
    notes: null,
    amenities: { name: "Gym" },
    ...overrides,
  }
}

describe("dashboard transforms", () => {
  it("calculates rent collection summary", () => {
    const payments = [
      rentPayment({ amount_paid: 1500, status: "paid", paid_at: new Date().toISOString() }),
      rentPayment({ due_date: new Date(Date.now() - 86400000).toISOString(), status: "pending" }),
    ]

    const summary = calculateRentCollectionSummary(payments)
    expect(summary.totalDue).toBe(3000)
    expect(summary.totalCollected).toBe(1500)
    expect(summary.outstanding).toBe(1500)
    expect(summary.overdueCount).toBe(1)
    expect(summary.collectionRate).toBeCloseTo(0.5)
  })

  it("summarizes maintenance backlog by priority", () => {
    const requests = [
      maintenanceRequest({ priority: "urgent" }),
      maintenanceRequest({ priority: "urgent" }),
      maintenanceRequest({ priority: "low", status: "completed" }),
    ]

    const summary = summarizeMaintenanceRequests(requests)
    expect(summary.totalOpen).toBe(2)
    expect(summary.byPriority.urgent).toBe(2)
    expect(summary.byPriority.low ?? 0).toBe(0)
  })

  it("summarizes visitor approvals", () => {
    const visitors = [
      visitorLog({ status: "pending" }),
      visitorLog({ status: "approved", arrival_date: new Date(Date.now() + 2 * 86400000).toISOString() }),
    ]

    const summary = summarizeVisitorApprovals(visitors)
    expect(summary.pendingCount).toBe(1)
    expect(summary.upcomingVisits).toBe(1)
  })

  it("summarizes document approvals", () => {
    const documents = [
      documentRow({ status: "pending", due_at: new Date(Date.now() - 86400000).toISOString() }),
      documentRow({ status: "approved" }),
    ]

    const summary = summarizeDocumentApprovals(documents)
    expect(summary.pendingCount).toBe(1)
    expect(summary.overdueCount).toBe(1)
  })

  it("selects upcoming bookings in chronological order", () => {
    const bookings = [
      bookingRow({ id: "2", starts_at: new Date(Date.now() + 3 * 86400000).toISOString() }),
      bookingRow({ id: "1", starts_at: new Date(Date.now() + 86400000).toISOString() }),
    ]

    const result = selectUpcomingBookings(bookings)
    expect(result[0]?.id).toBe("1")
  })

  it("selects recent payments ordered by paid date", () => {
    const payments = [
      rentPayment({ id: "1", amount_paid: 500, paid_at: new Date(Date.now() - 3600000).toISOString() }),
      rentPayment({ id: "2", amount_paid: 450, paid_at: new Date().toISOString() }),
    ]

    const result = selectRecentPayments(payments)
    expect(result.map((payment) => payment.id)).toEqual(["2", "1"])
  })
})

