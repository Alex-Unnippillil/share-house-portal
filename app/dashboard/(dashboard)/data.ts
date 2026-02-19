import "server-only"

import { cache } from "react"

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

const dashboardDataSource =
  process.env.DASHBOARD_DATA_SOURCE ??
  (process.env.NODE_ENV === "production" ? "production" : "mock")

const usingMockData = dashboardDataSource.toLowerCase() === "mock"

async function fetchWelcomeMessage(): Promise<WelcomeMessage> {
  return usingMockData ? fetchMockWelcomeMessage() : fetchProductionWelcomeMessage()
}

export const getWelcomeMessage = cache(fetchWelcomeMessage)

export function loadWelcomeMessageUncached() {
  return fetchWelcomeMessage()
}

async function fetchRentSummary(): Promise<RentSummary> {
  return usingMockData ? fetchMockRentSummary() : fetchProductionRentSummary()
}

export const getRentSummary = cache(fetchRentSummary)

export function loadRentSummaryUncached() {
  return fetchRentSummary()
}

async function fetchRecentDocuments(): Promise<DocumentSummary[]> {
  return usingMockData ? fetchMockRecentDocuments() : fetchProductionRecentDocuments()
}

export const getRecentDocuments = cache(fetchRecentDocuments)

export function loadRecentDocumentsUncached() {
  return fetchRecentDocuments()
}

async function fetchRoommateUpdates(): Promise<RoommateUpdate[]> {
  return usingMockData ? fetchMockRoommateUpdates() : fetchProductionRoommateUpdates()
}

export const getRoommateUpdates = cache(fetchRoommateUpdates)

export function loadRoommateUpdatesUncached() {
  return fetchRoommateUpdates()
}

async function fetchDashboardMetrics(): Promise<DashboardMetric[]> {
  return usingMockData ? fetchMockDashboardMetrics() : fetchProductionDashboardMetrics()
}

export const getDashboardMetrics = cache(fetchDashboardMetrics)

export function loadDashboardMetricsUncached() {
  return fetchDashboardMetrics()
}

async function fetchQuickActions(): Promise<QuickAction[]> {
  return usingMockData ? fetchMockQuickActions() : fetchProductionQuickActions()
}

export const getQuickActions = cache(fetchQuickActions)

export function loadQuickActionsUncached() {
  return fetchQuickActions()
}

async function fetchUpcomingBookings(): Promise<UpcomingBooking[]> {
  return usingMockData ? fetchMockUpcomingBookings() : fetchProductionUpcomingBookings()
}

export const getUpcomingBookings = cache(fetchUpcomingBookings)

export function loadUpcomingBookingsUncached() {
  return fetchUpcomingBookings()
}

async function fetchMaintenanceTickets(): Promise<MaintenanceTicket[]> {
  return usingMockData
    ? fetchMockMaintenanceTickets()
    : fetchProductionMaintenanceTickets()
}

export const getMaintenanceTickets = cache(fetchMaintenanceTickets)

export function loadMaintenanceTicketsUncached() {
  return fetchMaintenanceTickets()
}

async function fetchFloorplanWorkspace(): Promise<FloorplanWorkspace> {
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
