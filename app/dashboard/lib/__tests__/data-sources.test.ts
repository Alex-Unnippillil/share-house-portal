import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it, vi } from "vitest"

import type { Database } from "@/lib/supabase"

import {
  DashboardAccessContext,
  fetchBuildingAnalytics,
  fetchDocumentApprovals,
  fetchMaintenanceQueue,
  fetchMessageAlerts,
  fetchRentCollectionSummary,
  fetchUpcomingBookings,
  fetchVisitorApprovals,
  resolveAccessContext,
} from "../data-sources"

function createContext(
  tableHandlers: Record<string, any>,
  role: string = "property_manager"
): DashboardAccessContext {
  const from = vi.fn((table: string) => {
    const handler = tableHandlers[table]
    if (!handler) {
      throw new Error(`No handler configured for table ${table}`)
    }
    return handler
  })

  const supabase = { from } as unknown as SupabaseClient<Database>

  return {
    supabase,
    profile: { id: "user-1", role, full_name: "Test User" },
    buildings: [
      {
        id: "building-1",
        name: "Building One",
      },
    ],
  }
}

describe("dashboard data sources", () => {
  it("computes rent collection metrics and filters by building", async () => {
    const match = vi.fn().mockResolvedValue({
      data: [
        {
          id: "pay-1",
          amount: 1200,
          status: "paid",
          due_date: "2024-04-01T00:00:00.000Z",
          paid_at: "2024-04-01T10:00:00.000Z",
          autopay_enrolled: true,
          resident_name: "Alex",
        },
        {
          id: "pay-2",
          amount: 900,
          status: "overdue",
          due_date: "2024-04-05T00:00:00.000Z",
          paid_at: null,
          autopay_enrolled: false,
          resident_name: "Brianna",
        },
        {
          id: "pay-3",
          amount: 950,
          status: "pending",
          due_date: "2024-04-10T00:00:00.000Z",
          paid_at: null,
          autopay_enrolled: true,
          resident_name: "Chris",
        },
      ],
      error: null,
    })

    const select = vi.fn().mockReturnValue({ match })

    const context = createContext({
      rent_payments: { select },
    })

    const summary = await fetchRentCollectionSummary(context, "building-1")

    expect(select).toHaveBeenCalledWith(
      "id, amount, status, due_date, paid_at, autopay_enrolled, resident_name"
    )
    expect(match).toHaveBeenCalledWith({ building_id: "building-1" })
    expect(summary.totalCollected).toBe(1200)
    expect(summary.autopayCount).toBe(2)
    expect(summary.delinquentCount).toBe(1)
    expect(summary.upcoming[0].residentName).toBe("Brianna")
  })

  it("throws when role lacks manager permissions", async () => {
    const match = vi.fn().mockResolvedValue({ data: [], error: null })
    const select = vi.fn().mockReturnValue({ match })
    const context = createContext({
      rent_payments: { select },
    }, "tenant")

    await expect(fetchRentCollectionSummary(context, "building-1")).rejects.toThrow("forbidden")
  })

  it("filters upcoming bookings to future entries and sorts by start time", async () => {
    const now = new Date("2024-04-01T00:00:00.000Z").getTime()
    vi.useFakeTimers()
    vi.setSystemTime(now)

    const match = vi.fn().mockResolvedValue({
      data: [
        {
          id: "booking-1",
          amenity_name: "Gym",
          start_time: "2024-04-03T09:00:00.000Z",
          end_time: "2024-04-03T10:00:00.000Z",
          status: "scheduled",
          resident_name: "Jordan",
        },
        {
          id: "booking-2",
          amenity_name: "Roof Deck",
          start_time: "2024-03-25T09:00:00.000Z",
          end_time: "2024-03-25T10:00:00.000Z",
          status: "completed",
          resident_name: "Taylor",
        },
      ],
      error: null,
    })
    const select = vi.fn().mockReturnValue({ match })
    const context = createContext({
      amenity_bookings: { select },
    })

    const bookings = await fetchUpcomingBookings(context, "building-1")

    expect(bookings).toHaveLength(1)
    expect(bookings[0].amenityName).toBe("Gym")

    vi.useRealTimers()
  })

  it("derives maintenance metrics and preserves priority ordering", async () => {
    const match = vi.fn().mockResolvedValue({
      data: [
        {
          id: "m1",
          title: "Leaky faucet",
          priority: "high",
          status: "open",
          submitted_at: "2024-04-05T12:00:00.000Z",
          assigned_to: null,
        },
        {
          id: "m2",
          title: "Paint touch-up",
          priority: "low",
          status: "resolved",
          submitted_at: "2024-03-15T10:00:00.000Z",
          assigned_to: "Jamie",
        },
        {
          id: "m3",
          title: "Washer issue",
          priority: "medium",
          status: "open",
          submitted_at: "2024-04-06T09:30:00.000Z",
          assigned_to: "Morgan",
        },
      ],
      error: null,
    })
    const select = vi.fn().mockReturnValue({ match })
    const context = createContext({
      maintenance_requests: { select },
    })

    const queue = await fetchMaintenanceQueue(context, "building-1")

    expect(queue.metrics.totalOpen).toBe(2)
    expect(queue.metrics.highPriority).toBe(1)
    expect(queue.metrics.awaitingAssignment).toBe(1)
    expect(queue.requests[0].priority).toBe("high")
  })

  it("returns only pending visitor approvals", async () => {
    const match = vi.fn().mockResolvedValue({
      data: [
        {
          id: "v1",
          visitor_name: "Parent",
          host_name: "Lee",
          arrival_date: "2024-04-10T00:00:00.000Z",
          notes: "Weekend stay",
          approval_status: "pending",
        },
        {
          id: "v2",
          visitor_name: "Friend",
          host_name: "Quinn",
          arrival_date: "2024-04-02T00:00:00.000Z",
          notes: null,
          approval_status: "approved",
        },
      ],
      error: null,
    })
    const select = vi.fn().mockReturnValue({ match })
    const context = createContext({
      visitor_logs: { select },
    })

    const approvals = await fetchVisitorApprovals(context, "building-1")
    expect(approvals).toHaveLength(1)
    expect(approvals[0].visitorName).toBe("Parent")
  })

  it("returns outstanding document approvals", async () => {
    const match = vi.fn().mockResolvedValue({
      data: [
        {
          id: "d1",
          document_title: "Lease 2024",
          resident_name: "River",
          status: "pending",
          submitted_at: "2024-03-30T00:00:00.000Z",
        },
        {
          id: "d2",
          document_title: "Parking addendum",
          resident_name: "Sky",
          status: "completed",
          submitted_at: "2024-03-01T00:00:00.000Z",
        },
      ],
      error: null,
    })
    const select = vi.fn().mockReturnValue({ match })
    const context = createContext({
      document_workflows: { select },
    })

    const approvals = await fetchDocumentApprovals(context, "building-1")
    expect(approvals).toHaveLength(1)
    expect(approvals[0].documentTitle).toBe("Lease 2024")
  })

  it("sorts message alerts by last activity and limits to five", async () => {
    const match = vi.fn().mockResolvedValue({
      data: Array.from({ length: 7 }).map((_, index) => ({
        id: `thread-${index}`,
        subject: `Thread ${index}`,
        last_activity_at: new Date(2024, 3, index + 1).toISOString(),
        unresolved: index % 2 === 0,
        unread_count: index,
      })),
      error: null,
    })
    const select = vi.fn().mockReturnValue({ match })
    const context = createContext({
      message_threads: { select },
    })

    const alerts = await fetchMessageAlerts(context, "building-1")
    expect(alerts).toHaveLength(5)
    expect(alerts[0].id).toBe("thread-6")
    expect(alerts[alerts.length - 1].id).toBe("thread-2")
  })

  it("aggregates analytics across payments, maintenance, and bookings", async () => {
    const paymentsMatch = vi.fn().mockResolvedValue({
      data: [
        { id: "p1", amount: 1000, status: "paid", due_date: "2024-01-01", paid_at: "2024-01-01" },
        { id: "p2", amount: 800, status: "pending", due_date: "2024-01-01", paid_at: null },
        { id: "p3", amount: 1200, status: "paid", due_date: "2024-02-01", paid_at: "2024-02-02" },
      ],
      error: null,
    })
    const paymentsSelect = vi.fn().mockReturnValue({ match: paymentsMatch })

    const maintenanceMatch = vi.fn().mockResolvedValue({
      data: [
        { id: "m1", priority: "high", status: "open" },
        { id: "m2", priority: "low", status: "resolved" },
        { id: "m3", priority: "medium", status: "open" },
      ],
      error: null,
    })
    const maintenanceSelect = vi.fn().mockReturnValue({ match: maintenanceMatch })

    const bookingsMatch = vi.fn().mockResolvedValue({
      data: [
        { id: "b1", amenity_name: "Gym" },
        { id: "b2", amenity_name: "Gym" },
        { id: "b3", amenity_name: "Pool" },
      ],
      error: null,
    })
    const bookingsSelect = vi.fn().mockReturnValue({ match: bookingsMatch })

    const context = createContext({
      rent_payments: { select: paymentsSelect },
      maintenance_requests: { select: maintenanceSelect },
      amenity_bookings: { select: bookingsSelect },
    })

    const analytics = await fetchBuildingAnalytics(context, "building-1")
    expect(analytics.rentCollectionByMonth).toEqual([
      { month: "2024-01", collected: 1000, outstanding: 800 },
      { month: "2024-02", collected: 1200, outstanding: 0 },
    ])
    expect(analytics.amenityBookingsByAmenity).toEqual([
      { amenity: "Gym", count: 2 },
      { amenity: "Pool", count: 1 },
    ])
    expect(analytics.maintenanceByPriority.high).toBe(1)
    expect(analytics.maintenanceByPriority.medium).toBe(1)
  })

  it("enforces building access when requesting data", async () => {
    const context = createContext({}, "property_manager")
    await expect(fetchRentCollectionSummary(context, "other-building")).rejects.toThrow(
      "building_access_denied"
    )
  })

  it("resolves admin access with requested building", async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null })
    const profileSingle = vi.fn().mockResolvedValue({
      data: { id: "user-1", role: "admin", full_name: "Admin" },
      error: null,
    })
    const profileEq = vi.fn().mockReturnValue({ single: profileSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

    const buildingsOrder = vi.fn().mockResolvedValue({
      data: [
        { id: "building-1", name: "One" },
        { id: "building-2", name: "Two" },
      ],
      error: null,
    })
    const buildingsSelect = vi.fn().mockReturnValue({ order: buildingsOrder })

    const from = vi.fn((table: string) => {
      if (table === "profiles") {
        return { select: profileSelect }
      }
      if (table === "buildings") {
        return { select: buildingsSelect }
      }
      throw new Error(`Unexpected table ${table}`)
    })

    const supabase = {
      auth: { getUser },
      from,
    } as unknown as SupabaseClient<Database>

    const { context, activeBuilding } = await resolveAccessContext(supabase, "building-2")
    expect(context.buildings).toHaveLength(2)
    expect(activeBuilding.id).toBe("building-2")
  })

  it("resolves property manager access and defaults to first building when requested is missing", async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null })
    const profileSingle = vi.fn().mockResolvedValue({
      data: { id: "user-1", role: "property_manager", full_name: "Manager" },
      error: null,
    })
    const profileEq = vi.fn().mockReturnValue({ single: profileSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })

    const assignmentsEq = vi.fn().mockResolvedValue({
      data: [
        { building_id: "building-1", building_name: "One" },
        { building_id: "building-3", building_name: "Three" },
      ],
      error: null,
    })
    const assignmentsSelect = vi.fn().mockReturnValue({ eq: assignmentsEq })

    const from = vi.fn((table: string) => {
      if (table === "profiles") {
        return { select: profileSelect }
      }
      if (table === "building_staff_assignments") {
        return { select: assignmentsSelect }
      }
      throw new Error(`Unexpected table ${table}`)
    })

    const supabase = {
      auth: { getUser },
      from,
    } as unknown as SupabaseClient<Database>

    const { context, activeBuilding } = await resolveAccessContext(supabase, "unknown-building")
    expect(context.buildings).toHaveLength(2)
    expect(activeBuilding.id).toBe("building-1")
  })
})
