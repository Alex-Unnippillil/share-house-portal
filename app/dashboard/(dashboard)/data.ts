import "server-only"
import { cache } from "react"
import { revalidateTag, unstable_cache, unstable_noStore } from "next/cache"

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
  if (process.env.DASHBOARD_DATA_SOURCE?.toLowerCase() === "mock") {
    return "mock"
  }

  return hasSupabasePublicEnv() ? "production" : "mock"
}

const dashboardDataSource = resolveDashboardDataSource()
const usingMockData = dashboardDataSource.toLowerCase() === "mock"

export const DASHBOARD_CACHE_TAGS = {
  welcome: "dashboard:welcome",
  rent: "dashboard:rent",
  documents: "dashboard:documents",
  metrics: "dashboard:metrics",
  quickActions: "dashboard:quick-actions",
  bookings: "dashboard:bookings",
  maintenance: "dashboard:maintenance",
  floorplan: "dashboard:floorplan",
} as const

const DASHBOARD_REVALIDATE_SECONDS = {
  welcome: 60 * 10,
  rent: 60 * 3,
  documents: 60 * 5,
  metrics: 60 * 3,
  quickActions: 60 * 5,
  bookings: 60 * 2,
  maintenance: 60 * 3,
  floorplan: 60 * 10,
} as const

export type DashboardCacheTag =
  (typeof DASHBOARD_CACHE_TAGS)[keyof typeof DASHBOARD_CACHE_TAGS]

if (usingMockData) {
  console.warn(
    "[dashboard] Mock dashboard data enabled via DASHBOARD_DATA_SOURCE=mock. Remove the override to use production-backed data."
  )
}

function ensureProductionDataReady() {
  if (usingMockData) {
    return
  }

  if (!hasSupabasePublicEnv()) {
    throw new Error(
      "Dashboard production data requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)."
    )
  }
}

async function fetchWelcomeMessage(): Promise<WelcomeMessage> {
  ensureProductionDataReady()

  return usingMockData
    ? fetchMockWelcomeMessage()
    : fetchProductionWelcomeMessage()
}

async function fetchDashboardRole() {
  const { data } = await readUserSession()
  const claimedRole =
    data.session?.user?.app_metadata?.role ??
    data.session?.user?.user_metadata?.role
  return normalizePortalRole(
    typeof claimedRole === "string" ? claimedRole : null
  )
}

async function fetchDashboardCacheScope() {
  const { data } = await readUserSession()
  return data.session?.user?.id ?? "anonymous"
}

const getDashboardCacheScope = cache(fetchDashboardCacheScope)

const getWelcomeMessageCached = unstable_cache(
  async (_scope: string) => fetchWelcomeMessage(),
  ["dashboard-welcome-message"],
  {
    revalidate: DASHBOARD_REVALIDATE_SECONDS.welcome,
    tags: [DASHBOARD_CACHE_TAGS.welcome],
  }
)

export const getWelcomeMessage = cache(async () =>
  getWelcomeMessageCached(await getDashboardCacheScope())
)

export const getDashboardRole = cache(fetchDashboardRole)

export function loadWelcomeMessageUncached() {
  return fetchWelcomeMessage()
}

async function fetchRentSummary(): Promise<RentSummary> {
  ensureProductionDataReady()

  return usingMockData ? fetchMockRentSummary() : fetchProductionRentSummary()
}

const getRentSummaryCached = unstable_cache(
  async (_scope: string) => fetchRentSummary(),
  ["dashboard-rent-summary"],
  {
    revalidate: DASHBOARD_REVALIDATE_SECONDS.rent,
    tags: [DASHBOARD_CACHE_TAGS.rent],
  }
)

export const getRentSummary = cache(async () =>
  getRentSummaryCached(await getDashboardCacheScope())
)

export function loadRentSummaryUncached() {
  return fetchRentSummary()
}

async function fetchRecentDocuments(): Promise<DocumentSummary[]> {
  ensureProductionDataReady()

  return usingMockData
    ? fetchMockRecentDocuments()
    : fetchProductionRecentDocuments()
}

const getRecentDocumentsCached = unstable_cache(
  async (_scope: string) => fetchRecentDocuments(),
  ["dashboard-recent-documents"],
  {
    revalidate: DASHBOARD_REVALIDATE_SECONDS.documents,
    tags: [DASHBOARD_CACHE_TAGS.documents],
  }
)

export const getRecentDocuments = cache(async () =>
  getRecentDocumentsCached(await getDashboardCacheScope())
)

export function loadRecentDocumentsUncached() {
  return fetchRecentDocuments()
}

async function fetchRoommateUpdates(): Promise<RoommateUpdate[]> {
  ensureProductionDataReady()

  return usingMockData
    ? fetchMockRoommateUpdates()
    : fetchProductionRoommateUpdates()
}

export async function getRoommateUpdates() {
  unstable_noStore()
  return fetchRoommateUpdates()
}

export function loadRoommateUpdatesUncached() {
  return fetchRoommateUpdates()
}

async function fetchDashboardMetrics(): Promise<DashboardMetric[]> {
  ensureProductionDataReady()

  return usingMockData
    ? fetchMockDashboardMetrics()
    : fetchProductionDashboardMetrics()
}

const getDashboardMetricsCached = unstable_cache(
  async (_scope: string) => fetchDashboardMetrics(),
  ["dashboard-metrics"],
  {
    revalidate: DASHBOARD_REVALIDATE_SECONDS.metrics,
    tags: [DASHBOARD_CACHE_TAGS.metrics],
  }
)

export const getDashboardMetrics = cache(async () =>
  getDashboardMetricsCached(await getDashboardCacheScope())
)

export function loadDashboardMetricsUncached() {
  return fetchDashboardMetrics()
}

async function fetchQuickActions(): Promise<QuickAction[]> {
  ensureProductionDataReady()

  return usingMockData ? fetchMockQuickActions() : fetchProductionQuickActions()
}

const getQuickActionsCached = unstable_cache(
  async (_scope: string) => fetchQuickActions(),
  ["dashboard-quick-actions"],
  {
    revalidate: DASHBOARD_REVALIDATE_SECONDS.quickActions,
    tags: [DASHBOARD_CACHE_TAGS.quickActions],
  }
)

export const getQuickActions = cache(async () =>
  getQuickActionsCached(await getDashboardCacheScope())
)

export function loadQuickActionsUncached() {
  return fetchQuickActions()
}

async function fetchUpcomingBookings(): Promise<UpcomingBooking[]> {
  ensureProductionDataReady()

  return usingMockData
    ? fetchMockUpcomingBookings()
    : fetchProductionUpcomingBookings()
}

const getUpcomingBookingsCached = unstable_cache(
  async (_scope: string) => fetchUpcomingBookings(),
  ["dashboard-upcoming-bookings"],
  {
    revalidate: DASHBOARD_REVALIDATE_SECONDS.bookings,
    tags: [DASHBOARD_CACHE_TAGS.bookings],
  }
)

export const getUpcomingBookings = cache(async () =>
  getUpcomingBookingsCached(await getDashboardCacheScope())
)

export function loadUpcomingBookingsUncached() {
  return fetchUpcomingBookings()
}

async function fetchMaintenanceTickets(): Promise<MaintenanceTicket[]> {
  ensureProductionDataReady()

  return usingMockData
    ? fetchMockMaintenanceTickets()
    : fetchProductionMaintenanceTickets()
}

const getMaintenanceTicketsCached = unstable_cache(
  async (_scope: string) => fetchMaintenanceTickets(),
  ["dashboard-maintenance-tickets"],
  {
    revalidate: DASHBOARD_REVALIDATE_SECONDS.maintenance,
    tags: [DASHBOARD_CACHE_TAGS.maintenance],
  }
)

export const getMaintenanceTickets = cache(async () =>
  getMaintenanceTicketsCached(await getDashboardCacheScope())
)

export function loadMaintenanceTicketsUncached() {
  return fetchMaintenanceTickets()
}

async function fetchFloorplanWorkspace(): Promise<FloorplanWorkspace> {
  ensureProductionDataReady()

  return usingMockData
    ? fetchMockFloorplanWorkspace()
    : fetchProductionFloorplanWorkspace()
}

const getFloorplanWorkspaceCached = unstable_cache(
  async (_scope: string) => fetchFloorplanWorkspace(),
  ["dashboard-floorplan-workspace"],
  {
    revalidate: DASHBOARD_REVALIDATE_SECONDS.floorplan,
    tags: [DASHBOARD_CACHE_TAGS.floorplan],
  }
)

export const getFloorplanWorkspace = cache(async () =>
  getFloorplanWorkspaceCached(await getDashboardCacheScope())
)

export function loadFloorplanWorkspaceUncached() {
  return fetchFloorplanWorkspace()
}

export async function revalidateDashboardCacheTag(tag: DashboardCacheTag) {
  "use server"

  revalidateTag(tag)
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
