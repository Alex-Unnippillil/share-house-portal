import "server-only"

import { cache } from "react"

type WelcomeMessage = {
  title: string
  subtitle: string
  primaryAction: {
    href: string
    label: string
  }
  secondaryAction?: {
    href: string
    label: string
  }
}

type RentSummary = {
  amount: number
  dueDate: string
  autopayEnabled: boolean
  balance: number
  lastPaymentDate: string
  status: "due_soon" | "overdue" | "paid"
}

type DocumentSummary = {
  name: string
  href: string
  category: string
  status: "action_required" | "viewed" | "new"
  updatedAt: string
}

type RoommateUpdate = {
  id: string
  author: string
  message: string
  timestamp: string
  topic: "maintenance" | "announcement" | "logistics"
}

type DashboardMetric = {
  id: string
  label: string
  value: string
  helperText: string
  trend: {
    direction: "up" | "down" | "neutral"
    label: string
  }
  icon: "rent" | "calendar" | "roommates" | "maintenance"
}

type QuickAction = {
  id: string
  label: string
  description: string
  href: string
}

type ContributionCategory = {
  id: string
  name: string
  charges: number
  outstanding: number
  issued: number
}

type ContributionOverview = {
  outstandingTotal: number
  invoicedTotal: number
  categories: ContributionCategory[]
}

type UpcomingBooking = {
  id: string
  amenity: string
  date: string
  timeframe: string
  status: "confirmed" | "pending" | "waitlisted"
}

type MaintenanceTicket = {
  id: string
  title: string
  status: "scheduled" | "in_progress" | "awaiting_vendor"
  priority: "low" | "medium" | "high"
  updatedAt: string
}

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWelcomeMessage(): Promise<WelcomeMessage> {
  await wait(120)
  return {
    title: "Welcome back, Jordan",
    subtitle: "Here’s what’s happening with Unit 3B today.",
    primaryAction: {
      href: "/payments",
      label: "Settle rent",
    },
    secondaryAction: {
      href: "/schedule",
      label: "Book an amenity",
    },
  }
}

export const getWelcomeMessage = cache(fetchWelcomeMessage)

export function loadWelcomeMessageUncached() {
  return fetchWelcomeMessage()
}

async function fetchRentSummary(): Promise<RentSummary> {
  await wait(240)
  return {
    amount: 1260,
    dueDate: "2024-08-01",
    autopayEnabled: true,
    balance: 0,
    lastPaymentDate: "2024-07-01",
    status: "due_soon",
  }
}

export const getRentSummary = cache(fetchRentSummary)

export function loadRentSummaryUncached() {
  return fetchRentSummary()
}

async function fetchRecentDocuments(): Promise<DocumentSummary[]> {
  await wait(180)
  return [
    {
      name: "Lease agreement v2.pdf",
      href: "/documents",
      category: "Lease",
      status: "viewed",
      updatedAt: "2024-06-15",
    },
    {
      name: "House rules.pdf",
      href: "/documents",
      category: "Policies",
      status: "new",
      updatedAt: "2024-07-10",
    },
    {
      name: "September chore rotation.pdf",
      href: "/documents",
      category: "Chores",
      status: "action_required",
      updatedAt: "2024-07-22",
    },
  ]
}

export const getRecentDocuments = cache(fetchRecentDocuments)

export function loadRecentDocumentsUncached() {
  return fetchRecentDocuments()
}

async function fetchRoommateUpdates(): Promise<RoommateUpdate[]> {
  await wait(320)
  const now = new Date()
  return [
    {
      id: "1",
      author: "Jordan",
      message: "Wi-Fi was down earlier — rebooted the router and it’s stable again.",
      timestamp: new Date(now.getTime() - 1000 * 60 * 45).toISOString(),
      topic: "maintenance",
    },
    {
      id: "2",
      author: "Avery",
      message: "Can we swap parking spots this weekend while my guests visit?",
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 5).toISOString(),
      topic: "logistics",
    },
    {
      id: "3",
      author: "Property manager",
      message: "Reminder: fire alarm inspection on Thursday at 10:00 AM.",
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
      topic: "announcement",
    },
  ]
}

export const getRoommateUpdates = cache(fetchRoommateUpdates)

export function loadRoommateUpdatesUncached() {
  return fetchRoommateUpdates()
}

async function fetchDashboardMetrics(): Promise<DashboardMetric[]> {
  await wait(160)
  return [
    {
      id: "rent",
      label: "This month’s rent",
      value: "$1,260",
      helperText: "Due in 5 days",
      trend: { direction: "neutral", label: "Autopay scheduled" },
      icon: "rent",
    },
    {
      id: "calendar",
      label: "Upcoming bookings",
      value: "3",
      helperText: "Kitchen, TV room & parking",
      trend: { direction: "up", label: "+1 vs last week" },
      icon: "calendar",
    },
    {
      id: "roommates",
      label: "Roommate updates",
      value: "4",
      helperText: "New notes in the last 24h",
      trend: { direction: "up", label: "Active thread" },
      icon: "roommates",
    },
    {
      id: "maintenance",
      label: "Open maintenance",
      value: "2",
      helperText: "Both scheduled for this week",
      trend: { direction: "down", label: "No overdue items" },
      icon: "maintenance",
    },
  ]
}

export const getDashboardMetrics = cache(fetchDashboardMetrics)

export function loadDashboardMetricsUncached() {
  return fetchDashboardMetrics()
}

async function fetchQuickActions(): Promise<QuickAction[]> {
  await wait(140)
  return [
    {
      id: "payments",
      label: "Record a payment",
      description: "Log an off-platform rent payment",
      href: "/payments",
    },
    {
      id: "amenity",
      label: "Reserve an amenity",
      description: "Kitchen, TV room, parking & more",
      href: "/schedule",
    },
    {
      id: "visitor",
      label: "Register a visitor",
      description: "Stay compliant with overnight policy",
      href: "/visitors",
    },
  ]
}

export const getQuickActions = cache(fetchQuickActions)

export function loadQuickActionsUncached() {
  return fetchQuickActions()
}

async function fetchContributionOverview(): Promise<ContributionOverview> {
  await wait(180)
  return {
    outstandingTotal: 2645,
    invoicedTotal: 4785,
    categories: [
      {
        id: "rent",
        name: "Rent",
        charges: 3,
        outstanding: 2000,
        issued: 3780,
      },
      {
        id: "security-deposit",
        name: "Security deposit",
        charges: 3,
        outstanding: 430,
        issued: 750,
      },
      {
        id: "utilities",
        name: "Utilities",
        charges: 2,
        outstanding: 107,
        issued: 107,
      },
      {
        id: "parking",
        name: "Parking",
        charges: 1,
        outstanding: 40,
        issued: 80,
      },
      {
        id: "shared-fees",
        name: "Shared fees",
        charges: 1,
        outstanding: 38,
        issued: 38,
      },
      {
        id: "maintenance",
        name: "Maintenance",
        charges: 1,
        outstanding: 30,
        issued: 30,
      },
    ],
  }
}

export const getContributionOverview = cache(fetchContributionOverview)

export function loadContributionOverviewUncached() {
  return fetchContributionOverview()
}

async function fetchUpcomingBookings(): Promise<UpcomingBooking[]> {
  await wait(200)
  return [
    {
      id: "booking-1",
      amenity: "Kitchen",
      date: "2024-07-26",
      timeframe: "5:00 – 7:00 PM",
      status: "confirmed",
    },
    {
      id: "booking-2",
      amenity: "Parking spot",
      date: "2024-07-27",
      timeframe: "All day",
      status: "pending",
    },
    {
      id: "booking-3",
      amenity: "PlayStation nook",
      date: "2024-07-28",
      timeframe: "8:00 – 10:00 PM",
      status: "confirmed",
    },
  ]
}

export const getUpcomingBookings = cache(fetchUpcomingBookings)

export function loadUpcomingBookingsUncached() {
  return fetchUpcomingBookings()
}

async function fetchMaintenanceTickets(): Promise<MaintenanceTicket[]> {
  await wait(220)
  return [
    {
      id: "maintenance-1",
      title: "Washer door latch replacement",
      status: "scheduled",
      priority: "medium",
      updatedAt: "2024-07-22T14:30:00.000Z",
    },
    {
      id: "maintenance-2",
      title: "HVAC seasonal tune-up",
      status: "in_progress",
      priority: "high",
      updatedAt: "2024-07-21T09:00:00.000Z",
    },
  ]
}

export const getMaintenanceTickets = cache(fetchMaintenanceTickets)

export function loadMaintenanceTicketsUncached() {
  return fetchMaintenanceTickets()
}

export type {
  DashboardMetric,
  DocumentSummary,
  MaintenanceTicket,
  QuickAction,
  RentSummary,
  RoommateUpdate,
  UpcomingBooking,
  WelcomeMessage,
  ContributionCategory,
  ContributionOverview,
}
