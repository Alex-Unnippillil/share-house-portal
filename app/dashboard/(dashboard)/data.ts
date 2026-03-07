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
  if (process.env.DASHBOARD_DATA_SOURCE?.toLowerCase() === "mock") {
    return "mock"
  }

  return hasSupabasePublicEnv() ? "production" : "mock"
}

const dashboardDataSource = resolveDashboardDataSource()

const usingMockData = dashboardDataSource.toLowerCase() === "mock"

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
  ensureProductionDataReady()

  return usingMockData ? fetchMockRentSummary() : fetchProductionRentSummary()
}

export const getRentSummary = cache(fetchRentSummary)

export function loadRentSummaryUncached() {
  return fetchRentSummary()
}

async function fetchRecentDocuments(): Promise<DocumentSummary[]> {
  ensureProductionDataReady()

  return usingMockData
    ? fetchMockRecentDocuments()
    : fetchProductionRecentDocuments()
}

export const getRecentDocuments = cache(fetchRecentDocuments)

export function loadRecentDocumentsUncached() {
  return fetchRecentDocuments()
}

async function fetchRoommateUpdates(): Promise<RoommateUpdate[]> {
  ensureProductionDataReady()

  return usingMockData
    ? fetchMockRoommateUpdates()
    : fetchProductionRoommateUpdates()
}

export const getRoommateUpdates = cache(fetchRoommateUpdates)

export function loadRoommateUpdatesUncached() {
  return fetchRoommateUpdates()
}

async function fetchDashboardMetrics(): Promise<DashboardMetric[]> {
  ensureProductionDataReady()

  return usingMockData
    ? fetchMockDashboardMetrics()
    : fetchProductionDashboardMetrics()
}

export const getDashboardMetrics = cache(fetchDashboardMetrics)

export function loadDashboardMetricsUncached() {
  return fetchDashboardMetrics()
}

async function fetchQuickActions(): Promise<QuickAction[]> {
  ensureProductionDataReady()

  return usingMockData ? fetchMockQuickActions() : fetchProductionQuickActions()
}

export const getQuickActions = cache(fetchQuickActions)

export function loadQuickActionsUncached() {
  return fetchQuickActions()
}

async function fetchUpcomingBookings(): Promise<UpcomingBooking[]> {
  ensureProductionDataReady()

  return usingMockData
    ? fetchMockUpcomingBookings()
    : fetchProductionUpcomingBookings()
}

export const getUpcomingBookings = cache(fetchUpcomingBookings)

export function loadUpcomingBookingsUncached() {
  return fetchUpcomingBookings()
}

async function fetchMaintenanceTickets(): Promise<MaintenanceTicket[]> {
  ensureProductionDataReady()

  return usingMockData
    ? fetchMockMaintenanceTickets()
    : fetchProductionMaintenanceTickets()
}

export const getMaintenanceTickets = cache(fetchMaintenanceTickets)

export function loadMaintenanceTicketsUncached() {
  return fetchMaintenanceTickets()
}

async function fetchFloorplanWorkspace(): Promise<FloorplanWorkspace> {
  ensureProductionDataReady()

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
