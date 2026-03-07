import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const originalEnv = { ...process.env }

beforeEach(() => {
  vi.resetModules()
  vi.doMock("react", () => ({
    cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  }))
  process.env = { ...originalEnv }
  delete process.env.DASHBOARD_DATA_SOURCE
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
})

afterEach(() => {
  process.env = { ...originalEnv }
  vi.restoreAllMocks()
})

describe("dashboard data loaders in production mode", () => {
  it("falls back to mock data when Supabase public env vars are missing", async () => {
    process.env.NODE_ENV = "production"

    const dataModule = await import("@/app/dashboard/(dashboard)/data")

    await expect(dataModule.loadWelcomeMessageUncached()).resolves.toMatchObject({
      title: expect.any(String),
      primaryAction: expect.objectContaining({ href: expect.any(String) }),
    })
  })

  it("defaults to production data whenever Supabase public env vars are present", async () => {
    process.env.NODE_ENV = "development"
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"

    const fetchProductionWelcomeMessage = vi.fn(async () => ({
      title: "Welcome back, Taylor",
      subtitle: "From production",
      primaryAction: { href: "/payments", label: "Pay now" },
    }))

    const fetchMockWelcomeMessage = vi.fn(async () => ({
      title: "Mock welcome",
      subtitle: "Mock",
      primaryAction: { href: "/mock", label: "Mock" },
    }))

    vi.doMock("@/app/dashboard/(dashboard)/production-data", () => ({
      fetchProductionWelcomeMessage,
      fetchProductionRentSummary: vi.fn(async () => ({
        amount: 1200,
        dueDate: "2026-01-01",
        autopayEnabled: true,
        balance: 0,
        lastPaymentDate: "2025-12-01",
        status: "paid",
      })),
      fetchProductionRecentDocuments: vi.fn(async () => []),
      fetchProductionRoommateUpdates: vi.fn(async () => []),
      fetchProductionDashboardMetrics: vi.fn(async () => []),
      fetchProductionQuickActions: vi.fn(async () => []),
      fetchProductionUpcomingBookings: vi.fn(async () => []),
      fetchProductionMaintenanceTickets: vi.fn(async () => []),
      fetchProductionFloorplanWorkspace: vi.fn(async () => ({
        floorplanId: "fp-1",
        floorplanName: "Unit A",
        propertyId: "prop-1",
        unitId: "unit-1",
        svgMarkup: "<svg></svg>",
        currentVersion: 1,
        currentUserId: "user-1",
        currentUserRole: "tenant",
        roommates: [],
        annotations: [],
        annotationHistory: [],
      })),
    }))

    vi.doMock("@/app/dashboard/(dashboard)/mock-data", () => ({
      fetchMockWelcomeMessage,
      fetchMockRentSummary: vi.fn(async () => ({
        amount: 1200,
        dueDate: "2026-01-01",
        autopayEnabled: false,
        balance: 0,
        lastPaymentDate: "2025-12-01",
        status: "paid",
      })),
      fetchMockRecentDocuments: vi.fn(async () => []),
      fetchMockRoommateUpdates: vi.fn(async () => []),
      fetchMockDashboardMetrics: vi.fn(async () => []),
      fetchMockQuickActions: vi.fn(async () => []),
      fetchMockUpcomingBookings: vi.fn(async () => []),
      fetchMockMaintenanceTickets: vi.fn(async () => []),
      fetchMockFloorplanWorkspace: vi.fn(async () => ({
        floorplanId: "fp-1",
        floorplanName: "Unit A",
        propertyId: "prop-1",
        unitId: "unit-1",
        svgMarkup: "<svg></svg>",
        currentVersion: 1,
        currentUserId: "user-1",
        currentUserRole: "tenant",
        roommates: [],
        annotations: [],
        annotationHistory: [],
      })),
    }))

    const dataModule = await import("@/app/dashboard/(dashboard)/data")

    await dataModule.loadWelcomeMessageUncached()

    expect(fetchProductionWelcomeMessage).toHaveBeenCalledTimes(1)
    expect(fetchMockWelcomeMessage).not.toHaveBeenCalled()
  })

  it("uses mock data only when DASHBOARD_DATA_SOURCE=mock and logs a warning", async () => {
    process.env.NODE_ENV = "production"
    process.env.DASHBOARD_DATA_SOURCE = "mock"

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined)

    const fetchMockWelcomeMessage = vi.fn(async () => ({
      title: "Mock welcome",
      subtitle: "Mock",
      primaryAction: { href: "/mock", label: "Mock" },
    }))

    const fetchProductionWelcomeMessage = vi.fn(async () => ({
      title: "Welcome back, Taylor",
      subtitle: "From production",
      primaryAction: { href: "/payments", label: "Pay now" },
    }))

    vi.doMock("@/app/dashboard/(dashboard)/mock-data", () => ({
      fetchMockWelcomeMessage,
      fetchMockRentSummary: vi.fn(async () => ({
        amount: 1200,
        dueDate: "2026-01-01",
        autopayEnabled: false,
        balance: 0,
        lastPaymentDate: "2025-12-01",
        status: "paid",
      })),
      fetchMockRecentDocuments: vi.fn(async () => []),
      fetchMockRoommateUpdates: vi.fn(async () => []),
      fetchMockDashboardMetrics: vi.fn(async () => []),
      fetchMockQuickActions: vi.fn(async () => []),
      fetchMockUpcomingBookings: vi.fn(async () => []),
      fetchMockMaintenanceTickets: vi.fn(async () => []),
      fetchMockFloorplanWorkspace: vi.fn(async () => ({
        floorplanId: "fp-1",
        floorplanName: "Unit A",
        propertyId: "prop-1",
        unitId: "unit-1",
        svgMarkup: "<svg></svg>",
        currentVersion: 1,
        currentUserId: "user-1",
        currentUserRole: "tenant",
        roommates: [],
        annotations: [],
        annotationHistory: [],
      })),
    }))

    vi.doMock("@/app/dashboard/(dashboard)/production-data", () => ({
      fetchProductionWelcomeMessage,
      fetchProductionRentSummary: vi.fn(async () => ({
        amount: 1200,
        dueDate: "2026-01-01",
        autopayEnabled: true,
        balance: 0,
        lastPaymentDate: "2025-12-01",
        status: "paid",
      })),
      fetchProductionRecentDocuments: vi.fn(async () => []),
      fetchProductionRoommateUpdates: vi.fn(async () => []),
      fetchProductionDashboardMetrics: vi.fn(async () => []),
      fetchProductionQuickActions: vi.fn(async () => []),
      fetchProductionUpcomingBookings: vi.fn(async () => []),
      fetchProductionMaintenanceTickets: vi.fn(async () => []),
      fetchProductionFloorplanWorkspace: vi.fn(async () => ({
        floorplanId: "fp-1",
        floorplanName: "Unit A",
        propertyId: "prop-1",
        unitId: "unit-1",
        svgMarkup: "<svg></svg>",
        currentVersion: 1,
        currentUserId: "user-1",
        currentUserRole: "tenant",
        roommates: [],
        annotations: [],
        annotationHistory: [],
      })),
    }))

    const dataModule = await import("@/app/dashboard/(dashboard)/data")

    await dataModule.loadWelcomeMessageUncached()

    expect(fetchMockWelcomeMessage).toHaveBeenCalledTimes(1)
    expect(fetchProductionWelcomeMessage).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      "[dashboard] Mock dashboard data enabled via DASHBOARD_DATA_SOURCE=mock. Remove the override to use production-backed data."
    )
  })

  it("loads production data without throwing and returns expected shapes", async () => {
    process.env.NODE_ENV = "production"
    process.env.DASHBOARD_DATA_SOURCE = "production"
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"

    vi.doMock("@/app/dashboard/(dashboard)/production-data", () => ({
      fetchProductionWelcomeMessage: vi.fn(async () => ({
        title: "Welcome back, Alex",
        subtitle: "Snapshot",
        primaryAction: { href: "/payments", label: "Pay now" },
      })),
      fetchProductionRentSummary: vi.fn(async () => ({
        amount: 1200,
        dueDate: "2026-01-01",
        autopayEnabled: true,
        balance: 0,
        lastPaymentDate: "2025-12-01",
        status: "paid",
      })),
      fetchProductionRecentDocuments: vi.fn(async () => [
        {
          name: "Lease",
          href: "/documents",
          category: "lease",
          status: "viewed",
          updatedAt: "2025-10-10",
        },
      ]),
      fetchProductionRoommateUpdates: vi.fn(async () => [
        {
          id: "update-1",
          author: "Sam",
          message: "Kitchen cleaned",
          timestamp: "2025-10-11T10:00:00.000Z",
          topic: "logistics",
        },
      ]),
      fetchProductionDashboardMetrics: vi.fn(async () => [
        {
          id: "rent",
          label: "Rent",
          value: "$1200",
          helperText: "Paid",
          trend: { direction: "neutral", label: "Stable" },
          icon: "rent",
        },
      ]),
      fetchProductionQuickActions: vi.fn(async () => [
        {
          id: "payments",
          label: "Record payment",
          description: "Track payment",
          href: "/payments",
        },
      ]),
      fetchProductionUpcomingBookings: vi.fn(async () => [
        {
          id: "booking-1",
          amenity: "Kitchen",
          date: "2025-10-12",
          timeframe: "6:00 PM – 7:00 PM",
          status: "confirmed",
        },
      ]),
      fetchProductionMaintenanceTickets: vi.fn(async () => [
        {
          id: "ticket-1",
          title: "Leaky sink",
          status: "scheduled",
          priority: "medium",
          updatedAt: "2025-10-11T08:00:00.000Z",
        },
      ]),
      fetchProductionFloorplanWorkspace: vi.fn(async () => ({
        floorplanId: "fp-1",
        floorplanName: "Unit A",
        propertyId: "prop-1",
        unitId: "unit-1",
        svgMarkup: "<svg></svg>",
        currentVersion: 3,
        currentUserId: "user-1",
        currentUserRole: "tenant",
        roommates: [],
        annotations: [],
        annotationHistory: [],
      })),
    }))

    const dataModule = await import("@/app/dashboard/(dashboard)/data")

    await expect(dataModule.loadWelcomeMessageUncached()).resolves.toMatchObject({
      title: expect.any(String),
      primaryAction: expect.objectContaining({ href: expect.any(String) }),
    })
    await expect(dataModule.loadRentSummaryUncached()).resolves.toMatchObject({
      amount: expect.any(Number),
      status: expect.stringMatching(/due_soon|overdue|paid/),
    })
    await expect(dataModule.loadRecentDocumentsUncached()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: expect.any(String), href: expect.any(String) }),
      ])
    )
    await expect(dataModule.loadRoommateUpdatesUncached()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: expect.any(String), topic: expect.any(String) }),
      ])
    )
    await expect(dataModule.loadDashboardMetricsUncached()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: expect.any(String), icon: expect.any(String) }),
      ])
    )
    await expect(dataModule.loadQuickActionsUncached()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: expect.any(String), href: expect.any(String) }),
      ])
    )
    await expect(dataModule.loadUpcomingBookingsUncached()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: expect.any(String), status: expect.any(String) }),
      ])
    )
    await expect(dataModule.loadMaintenanceTicketsUncached()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: expect.any(String), priority: expect.any(String) }),
      ])
    )
    await expect(dataModule.loadFloorplanWorkspaceUncached()).resolves.toMatchObject({
      floorplanId: expect.any(String),
      svgMarkup: expect.any(String),
      annotations: expect.any(Array),
    })
  })
})
