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

const requestedMockData = dashboardDataSource.toLowerCase() === "mock"

let hasLoggedMissingSupabaseWarning = false

function shouldUseMockData() {
  if (requestedMockData || process.env.NODE_ENV === "development") {
    return true
  }

  if (!hasSupabasePublicEnv()) {
    if (!hasLoggedMissingSupabaseWarning) {
      console.warn(
        "Dashboard production data requested without Supabase public environment variables. Falling back to mock data."
      )
      hasLoggedMissingSupabaseWarning = true
    }

    return true
  }

  return false
}

function ensureProductionDataReady() {
  shouldUseMockData()
}

async function fetchWelcomeMessage(): Promise<WelcomeMessage> {
  ensureProductionDataReady()

  return shouldUseMockData()
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

  return shouldUseMockData() ? fetchMockRentSummary() : fetchProductionRentSummary()
}

export const getRentSummary = cache(fetchRentSummary)

export function loadRentSummaryUncached() {
  return fetchRentSummary()
}

async function fetchRecentDocuments(): Promise<DocumentSummary[]> {
  ensureProductionDataReady()

  return shouldUseMockData()
    ? fetchMockRecentDocuments()
    : fetchProductionRecentDocuments()
}

export const getRecentDocuments = cache(fetchRecentDocuments)

export function loadRecentDocumentsUncached() {
  return fetchRecentDocuments()
}

async function fetchRoommateUpdates(): Promise<RoommateUpdate[]> {
  ensureProductionDataReady()

  return shouldUseMockData()
    ? fetchMockRoommateUpdates()
    : fetchProductionRoommateUpdates()
}

export const getRoommateUpdates = cache(fetchRoommateUpdates)

export function loadRoommateUpdatesUncached() {
  return fetchRoommateUpdates()
}

async function fetchDashboardMetrics(): Promise<DashboardMetric[]> {
  ensureProductionDataReady()

  return shouldUseMockData()
    ? fetchMockDashboardMetrics()
    : fetchProductionDashboardMetrics()
}

export const getDashboardMetrics = cache(fetchDashboardMetrics)

export function loadDashboardMetricsUncached() {
  return fetchDashboardMetrics()
}

async function fetchQuickActions(): Promise<QuickAction[]> {
  ensureProductionDataReady()

  return shouldUseMockData() ? fetchMockQuickActions() : fetchProductionQuickActions()
}

export const getQuickActions = cache(fetchQuickActions)

export function loadQuickActionsUncached() {
  return fetchQuickActions()
}

async function fetchUpcomingBookings(): Promise<UpcomingBooking[]> {
  ensureProductionDataReady()

  return shouldUseMockData()
    ? fetchMockUpcomingBookings()
    : fetchProductionUpcomingBookings()
}

export const getUpcomingBookings = cache(fetchUpcomingBookings)

export function loadUpcomingBookingsUncached() {
  return fetchUpcomingBookings()
}

async function fetchMaintenanceTickets(): Promise<MaintenanceTicket[]> {
  ensureProductionDataReady()

  return shouldUseMockData()
    ? fetchMockMaintenanceTickets()
    : fetchProductionMaintenanceTickets()
}

export const getMaintenanceTickets = cache(fetchMaintenanceTickets)

export function loadMaintenanceTicketsUncached() {
  return fetchMaintenanceTickets()
}

async function fetchFloorplanWorkspace(): Promise<FloorplanWorkspace> {
  ensureProductionDataReady()

  return shouldUseMockData()
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
