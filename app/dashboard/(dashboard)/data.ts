import "server-only"

import { cache } from "react"

import { getFloorplanSvg } from "@/lib/data/floorplans"
import { createSupbaseServerClientReadOnly } from "@/utils/supaone"

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

type FloorplanRoommate = {
  id: string
  name: string
  role: "tenant" | "roommate" | "property_manager" | "admin" | "user"
}

type FloorplanAnnotation = {
  id: string
  markerType: "room" | "storage" | "chore"
  label: string
  note: string | null
  x: number
  y: number
  createdBy: string
  visibilityScope: "all_roommates" | "selected_roommates" | "private"
  visibleToUserIds: string[]
  version: number
  updatedAt: string
}

type FloorplanAnnotationVersion = {
  id: string
  annotationId: string
  action: "created" | "updated" | "deleted" | "rollback"
  version: number
  changedBy: string
  changedAt: string
  snapshot: FloorplanAnnotation
}

type FloorplanWorkspace = {
  floorplanId: string
  floorplanName: string
  propertyId: string
  unitId: string
  svgMarkup: string
  currentVersion: number
  currentUserId: string
  currentUserRole: "tenant" | "roommate" | "property_manager" | "admin" | "user"
  roommates: FloorplanRoommate[]
  annotations: FloorplanAnnotation[]
  annotationHistory: FloorplanAnnotationVersion[]
}

async function getViewerContext() {
  const supabase = await createSupbaseServerClientReadOnly()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, user: null, profile: null }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,full_name,role,unit_id,rent_share")
    .eq("id", user.id)
    .maybeSingle()

  return { supabase, user, profile }
}

async function fetchWelcomeMessage(): Promise<WelcomeMessage> {
  const { profile } = await getViewerContext()
  const firstName = profile?.full_name?.split(" ")[0] ?? "there"

  return {
    title: `Welcome back, ${firstName}`,
    subtitle: profile?.unit_id
      ? `Here’s what’s happening for your unit (${profile.unit_id}) today.`
      : "Here’s what’s happening in your household today.",
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
  const { supabase, user, profile } = await getViewerContext()

  const [{ data: latestPayment }, { data: subscription }, { data: openBalances }] = await Promise.all([
    user
      ? supabase
          .from("rent_payments")
          .select("amount,created_at,status")
          .eq("user_id", user.id)
          .in("status", ["completed", "succeeded"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from("subscriptions")
          .select("current_period_end,status")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from("rent_payments")
          .select("amount")
          .eq("user_id", user.id)
          .in("status", ["pending", "failed"])
      : Promise.resolve({ data: [] }),
  ])

  const dueDate =
    subscription?.current_period_end ??
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()

  const balance = (openBalances ?? []).reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)
  const amount = Number(profile?.rent_share ?? latestPayment?.amount ?? 0)

  return {
    amount,
    dueDate,
    autopayEnabled: subscription?.status === "active",
    balance,
    lastPaymentDate: latestPayment?.created_at ?? new Date().toISOString(),
    status: balance > 0 ? "overdue" : "due_soon",
  }
}

export const getRentSummary = cache(fetchRentSummary)

export function loadRentSummaryUncached() {
  return fetchRentSummary()
}

async function fetchRecentDocuments(): Promise<DocumentSummary[]> {
  const { supabase, user, profile } = await getViewerContext()
  if (!user) {
    return []
  }

  const { data } = await supabase
    .from("documents")
    .select("id,title,document_type,status,updated_at,tenant_id,unit_id")
    .or(`tenant_id.eq.${user.id}${profile?.unit_id ? `,unit_id.eq.${profile.unit_id}` : ""}`)
    .order("updated_at", { ascending: false })
    .limit(3)

  return (data ?? []).map((document) => ({
    name: document.title,
    href: "/documents",
    category: document.document_type.replaceAll("_", " "),
    status:
      document.status === "pending_signature" || document.status === "draft"
        ? "action_required"
        : document.status === "signed"
          ? "viewed"
          : "new",
    updatedAt: document.updated_at ?? new Date().toISOString(),
  }))
}

export const getRecentDocuments = cache(fetchRecentDocuments)

export function loadRecentDocumentsUncached() {
  return fetchRecentDocuments()
}

async function fetchRoommateUpdates(): Promise<RoommateUpdate[]> {
  const { supabase, profile } = await getViewerContext()

  const query = supabase
    .from("threads")
    .select("id,title,summary,category,activity,owner_name,last_message_at,updated_at,created_at,unit_id")
    .order("last_message_at", { ascending: false })
    .limit(6)

  const { data } = profile?.unit_id ? await query.eq("unit_id", profile.unit_id) : await query

  return (data ?? []).slice(0, 3).map((thread) => ({
    id: thread.id,
    author: thread.owner_name ?? "Roommate",
    message: thread.activity ?? thread.summary ?? thread.title,
    timestamp: thread.last_message_at ?? thread.updated_at ?? thread.created_at ?? new Date().toISOString(),
    topic: thread.category.includes("maintenance")
      ? "maintenance"
      : thread.category.includes("announce")
        ? "announcement"
        : "logistics",
  }))
}

export const getRoommateUpdates = cache(fetchRoommateUpdates)

export function loadRoommateUpdatesUncached() {
  return fetchRoommateUpdates()
}

async function fetchDashboardMetrics(): Promise<DashboardMetric[]> {
  const [{ amount, dueDate }, bookings, updates, tickets] = await Promise.all([
    fetchRentSummary(),
    fetchUpcomingBookings(),
    fetchRoommateUpdates(),
    fetchMaintenanceTickets(),
  ])

  return [
    {
      id: "rent",
      label: "This month’s rent",
      value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount),
      helperText: `Due ${new Date(dueDate).toLocaleDateString()}`,
      trend: { direction: "neutral", label: "Synced from billing" },
      icon: "rent",
    },
    {
      id: "calendar",
      label: "Upcoming bookings",
      value: String(bookings.length),
      helperText: "Pulled from your booking history",
      trend: { direction: "up", label: "Live amenity schedule" },
      icon: "calendar",
    },
    {
      id: "roommates",
      label: "Roommate updates",
      value: String(updates.length),
      helperText: "Most recent board activity",
      trend: { direction: "up", label: "Realtime thread activity" },
      icon: "roommates",
    },
    {
      id: "maintenance",
      label: "Open maintenance",
      value: String(tickets.length),
      helperText: "Outstanding work orders",
      trend: { direction: "down", label: "Synced with requests" },
      icon: "maintenance",
    },
  ]
}

export const getDashboardMetrics = cache(fetchDashboardMetrics)

export function loadDashboardMetricsUncached() {
  return fetchDashboardMetrics()
}

async function fetchQuickActions(): Promise<QuickAction[]> {
  return [
    {
      id: "payments",
      label: "Record a payment",
      description: "Log or review rent payments",
      href: "/payments",
    },
    {
      id: "amenity",
      label: "Reserve an amenity",
      description: "Create or manage amenity bookings",
      href: "/schedule",
    },
    {
      id: "visitor",
      label: "Register a visitor",
      description: "Add and track overnight visitor stays",
      href: "/visitors",
    },
  ]
}

export const getQuickActions = cache(fetchQuickActions)

export function loadQuickActionsUncached() {
  return fetchQuickActions()
}

function formatBookingTimeframe(startTime: string, endTime: string) {
  return `${new Date(startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} – ${new Date(endTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
}

async function fetchUpcomingBookings(): Promise<UpcomingBooking[]> {
  const { supabase, user } = await getViewerContext()
  if (!user) {
    return []
  }

  const { data } = await supabase
    .from("bookings")
    .select("id,amenity_name,start_time,end_time,status")
    .eq("tenant_id", user.id)
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(3)

  return (data ?? []).map((booking) => ({
    id: booking.id,
    amenity: booking.amenity_name,
    date: booking.start_time,
    timeframe: formatBookingTimeframe(booking.start_time, booking.end_time),
    status: booking.status === "cancelled" ? "waitlisted" : booking.status,
  }))
}

export const getUpcomingBookings = cache(fetchUpcomingBookings)

export function loadUpcomingBookingsUncached() {
  return fetchUpcomingBookings()
}

async function fetchMaintenanceTickets(): Promise<MaintenanceTicket[]> {
  const { supabase, user, profile } = await getViewerContext()

  let query = supabase
    .from("maintenance_requests")
    .select("id,title,status,priority,updated_at,unit_id,requested_by")
    .in("status", ["pending", "in_progress"])
    .order("updated_at", { ascending: false })
    .limit(3)

  if (profile?.unit_id) {
    query = query.eq("unit_id", profile.unit_id)
  } else if (user) {
    query = query.eq("requested_by", user.id)
  }

  const { data } = await query

  return (data ?? []).map((ticket) => ({
    id: ticket.id,
    title: ticket.title,
    status: ticket.status === "pending" ? "awaiting_vendor" : "in_progress",
    priority: ticket.priority === "urgent" ? "high" : ticket.priority === "normal" ? "medium" : ticket.priority,
    updatedAt: ticket.updated_at ?? new Date().toISOString(),
  }))
}

export const getMaintenanceTickets = cache(fetchMaintenanceTickets)

export function loadMaintenanceTicketsUncached() {
  return fetchMaintenanceTickets()
}

async function fetchFloorplanWorkspace(): Promise<FloorplanWorkspace> {
  const { supabase, user, profile } = await getViewerContext()

  const { data: floorplan } = profile?.unit_id
    ? await supabase
        .from("floorplans")
        .select("id,property_id,unit_id,storage_path,current_version")
        .eq("unit_id", profile.unit_id)
        .order("uploaded_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null }

  if (!floorplan || !profile?.unit_id || !user) {
    return {
      floorplanId: "",
      floorplanName: "No floorplan yet",
      propertyId: "",
      unitId: profile?.unit_id ?? "",
      svgMarkup: "<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'></svg>",
      currentVersion: 0,
      currentUserId: user?.id ?? "",
      currentUserRole: profile?.role ?? "user",
      roommates: [],
      annotations: [],
      annotationHistory: [],
    }
  }

  const [annotationsResult, historyResult, roommatesResult] = await Promise.all([
    supabase
      .from("floorplan_annotations")
      .select("*")
      .eq("floorplan_id", floorplan.id)
      .is("archived_at", null)
      .order("updated_at", { ascending: false }),
    supabase
      .from("floorplan_annotation_versions")
      .select("id,annotation_id,action,version,changed_by,changed_at,snapshot")
      .eq("floorplan_id", floorplan.id)
      .order("changed_at", { ascending: false })
      .limit(25),
    supabase
      .from("profiles")
      .select("id,full_name,role")
      .eq("unit_id", profile.unit_id),
  ])

  const annotations = (annotationsResult.data ?? []).map((annotation) => ({
    id: annotation.id,
    markerType: annotation.marker_type,
    label: annotation.label,
    note: annotation.note,
    x: annotation.x_position,
    y: annotation.y_position,
    createdBy: annotation.created_by,
    visibilityScope: annotation.visibility_scope,
    visibleToUserIds: annotation.visible_to_user_ids ?? [],
    version: annotation.version,
    updatedAt: annotation.updated_at,
  }))

  const annotationsById = new Map(annotations.map((annotation) => [annotation.id, annotation]))

  const annotationHistory = (historyResult.data ?? []).flatMap((entry) => {
    const currentAnnotation = annotationsById.get(entry.annotation_id)
    if (!currentAnnotation) {
      return []
    }

    return {
      id: entry.id,
      annotationId: entry.annotation_id,
      action: entry.action,
      version: entry.version,
      changedBy: entry.changed_by ?? currentAnnotation.createdBy,
      changedAt: entry.changed_at,
      snapshot: currentAnnotation,
    }
  })

  let svgMarkup = "<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'></svg>"
  try {
    svgMarkup = await getFloorplanSvg(supabase as any, floorplan.storage_path)
  } catch {
    // Keep an empty SVG fallback if the storage asset is missing.
  }

  return {
    floorplanId: floorplan.id,
    floorplanName: `Unit ${floorplan.unit_id} layout`,
    propertyId: floorplan.property_id ?? "",
    unitId: floorplan.unit_id ?? "",
    svgMarkup,
    currentVersion: floorplan.current_version,
    currentUserId: user.id,
    currentUserRole: profile.role ?? "user",
    roommates: (roommatesResult.data ?? []).map((roommate) => ({
      id: roommate.id,
      name: roommate.full_name ?? "Roommate",
      role: roommate.role ?? "user",
    })),
    annotations,
    annotationHistory,
  }
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
