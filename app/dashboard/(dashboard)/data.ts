import "server-only"
import { cache } from "react"
import { readUserSession } from "@/utils/actions"
import { hasSupabasePublicEnv } from "@/utils/supabase/env"

import { normalizePortalRole } from "@/lib/role-cues"

import {
  fetchMockDashboardMetrics,
  fetchMockFloorplanWorkspace,
  fetchMockMaintenanceTickets,
  fetchMockQuickActions,
  fetchMockRecentDocuments,
  fetchMockRentSummary,
  fetchMockRoommateUpdates,
  fetchMockUpcomingBookings,
  fetchMockWelcomeMessage,
} from "./mock-data"
import {
  fetchProductionDashboardMetrics,
  fetchProductionFloorplanWorkspace,
  fetchProductionMaintenanceTickets,
  fetchProductionQuickActions,
  fetchProductionRecentDocuments,
  fetchProductionRentSummary,
  fetchProductionRoommateUpdates,
  fetchProductionUpcomingBookings,
  fetchProductionWelcomeMessage,
} from "./production-data"
import type {
  DashboardMetric,
  DocumentSummary,
  FloorplanAnnotation,
  FloorplanAnnotationVersion,
  FloorplanRoommate,
  FloorplanWorkspace,
  MaintenanceTicket,
  QuickAction,
  RentSummary,
  RoommateUpdate,
  UpcomingBooking,
  WelcomeMessage,
} from "./types"

function resolveDashboardDataSource() {
  if (process.env.DASHBOARD_DATA_SOURCE) {
    return process.env.DASHBOARD_DATA_SOURCE
  }

  return process.env.NODE_ENV === "development" ? "mock" : "production"
}

const dashboardDataSource = resolveDashboardDataSource()

const usingMockData = dashboardDataSource.toLowerCase() === "mock"
let hasLoggedDashboardDataConfigError = false

function getFallbackRentSummary(): RentSummary {
  const nextDueDate = new Date()
  nextDueDate.setDate(1)
  nextDueDate.setMonth(nextDueDate.getMonth() + 1)

  return {
    amount: 0,
    dueDate: nextDueDate.toISOString().slice(0, 10),
    autopayEnabled: false,
    balance: 0,
    lastPaymentDate: "",
    status: "paid",
  }
}

function getFallbackFloorplanWorkspace(): FloorplanWorkspace {
  return {
    floorplanId: "fallback-floorplan",
    floorplanName: "Unit floorplan",
    propertyId: "",
    unitId: "",
    svgMarkup:
      '<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Floorplan coming soon"><rect width="100" height="60" fill="#0f172a" /><text x="50" y="32" text-anchor="middle" fill="#e2e8f0" font-size="6">Floorplan not uploaded yet</text></svg>',
    currentVersion: 1,
    currentUserId: "",
    currentUserRole: "tenant",
    roommates: [],
    annotations: [],
    annotationHistory: [],
  }
}

function ensureProductionDataReady() {
  if (usingMockData || process.env.NODE_ENV === "development") {
    return true
  }

  if (!hasSupabasePublicEnv()) {
    if (!hasLoggedDashboardDataConfigError) {
      console.error(
        "Dashboard production data requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)."
      )
      hasLoggedDashboardDataConfigError = true
    }

    return false
  }

  return true
}

async function fetchWelcomeMessage(): Promise<WelcomeMessage> {
  if (!ensureProductionDataReady()) {
    return {
      title: "Welcome back",
      subtitle: "Finish environment setup to load your live dashboard data.",
      primaryAction: {
        href: "/dashboard/operations",
        label: "Open operations",
      },
    }
  }

  return usingMockData
    ? fetchMockWelcomeMessage()
    : fetchProductionWelcomeMessage()
}

export const getWelcomeMessage = cache(fetchWelcomeMessage)

async function fetchDashboardRole() {
  const { data } = await readUserSession()
  const claimedRole =
    data.session?.user?.app_metadata?.role ??
    data.session?.user?.user_metadata?.role
  return normalizePortalRole(
    typeof claimedRole === "string" ? claimedRole : null
  )
}

export const getDashboardRole = cache(fetchDashboardRole)

export function loadWelcomeMessageUncached() {
  return fetchWelcomeMessage()
}

async function fetchRentSummary(): Promise<RentSummary> {
  if (!ensureProductionDataReady()) {
    return getFallbackRentSummary()
  }

  return usingMockData ? fetchMockRentSummary() : fetchProductionRentSummary()
}

export const getRentSummary = cache(fetchRentSummary)

export function loadRentSummaryUncached() {
  return fetchRentSummary()
}

async function fetchRecentDocuments(): Promise<DocumentSummary[]> {
  if (!ensureProductionDataReady()) {
    return []
  }

  return usingMockData
    ? fetchMockRecentDocuments()
    : fetchProductionRecentDocuments()
}

export const getRecentDocuments = cache(fetchRecentDocuments)

export function loadRecentDocumentsUncached() {
  return fetchRecentDocuments()
}

async function fetchRoommateUpdates(): Promise<RoommateUpdate[]> {
  if (!ensureProductionDataReady()) {
    return []
  }

  return usingMockData
    ? fetchMockRoommateUpdates()
    : fetchProductionRoommateUpdates()
}

export const getRoommateUpdates = cache(fetchRoommateUpdates)

export function loadRoommateUpdatesUncached() {
  return fetchRoommateUpdates()
}

async function fetchDashboardMetrics(): Promise<DashboardMetric[]> {
  if (!ensureProductionDataReady()) {
    return []
  }

  return usingMockData
    ? fetchMockDashboardMetrics()
    : fetchProductionDashboardMetrics()
}

export const getDashboardMetrics = cache(fetchDashboardMetrics)

export function loadDashboardMetricsUncached() {
  return fetchDashboardMetrics()
}

async function fetchQuickActions(): Promise<QuickAction[]> {
  if (!ensureProductionDataReady()) {
    return []
  }

  return usingMockData ? fetchMockQuickActions() : fetchProductionQuickActions()
}

export const getQuickActions = cache(fetchQuickActions)

export function loadQuickActionsUncached() {
  return fetchQuickActions()
}

async function fetchUpcomingBookings(): Promise<UpcomingBooking[]> {
  if (!ensureProductionDataReady()) {
    return []
  }

  return usingMockData
    ? fetchMockUpcomingBookings()
    : fetchProductionUpcomingBookings()
}

export const getUpcomingBookings = cache(fetchUpcomingBookings)

export function loadUpcomingBookingsUncached() {
  return fetchUpcomingBookings()
}

async function fetchMaintenanceTickets(): Promise<MaintenanceTicket[]> {
  if (!ensureProductionDataReady()) {
    return []
  }

  return usingMockData
    ? fetchMockMaintenanceTickets()
    : fetchProductionMaintenanceTickets()
}

export const getMaintenanceTickets = cache(fetchMaintenanceTickets)

export function loadMaintenanceTicketsUncached() {
  return fetchMaintenanceTickets()
}

async function fetchFloorplanWorkspace(): Promise<FloorplanWorkspace> {
  if (!ensureProductionDataReady()) {
    return getFallbackFloorplanWorkspace()
  }

  return usingMockData
    ? fetchMockFloorplanWorkspace()
    : fetchProductionFloorplanWorkspace()
}

export const getFloorplanWorkspace = cache(fetchFloorplanWorkspace)

export function loadFloorplanWorkspaceUncached() {
  return fetchFloorplanWorkspace()
}

export type {
  DashboardMetric,
  DocumentSummary,
  FloorplanAnnotation,
  FloorplanAnnotationVersion,
  FloorplanRoommate,
  FloorplanWorkspace,
  MaintenanceTicket,
  QuickAction,
  RentSummary,
  RoommateUpdate,
  UpcomingBooking,
  WelcomeMessage,
}
