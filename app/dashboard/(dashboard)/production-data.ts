import "server-only"

import { createSupbaseServerClientReadOnly } from "@/utils/supaone"

import type {
  DashboardMetric,
  DocumentSummary,
  FloorplanAnnotation,
  FloorplanWorkspace,
  MaintenanceTicket,
  QuickAction,
  RentSummary,
  RoommateUpdate,
  UpcomingBooking,
  WelcomeMessage,
} from "./types"

const DEFAULT_USER_NAME = "there"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount)
}

function getInitialRentSummary(): RentSummary {
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

function computeRentStatus(amount: number, dueDate: string | null, hasSuccessfulPayment: boolean): RentSummary["status"] {
  if (hasSuccessfulPayment) {
    return "paid"
  }

  if (!dueDate) {
    return "due_soon"
  }

  const dueDateTime = new Date(dueDate).getTime()
  if (Number.isNaN(dueDateTime)) {
    return "due_soon"
  }

  return dueDateTime < Date.now() ? "overdue" : "due_soon"
}

function toDocumentStatus(status: string): DocumentSummary["status"] {
  if (status === "pending_signature") {
    return "action_required"
  }

  if (status === "signed") {
    return "viewed"
  }

  return "new"
}

function toMaintenanceStatus(status: string): MaintenanceTicket["status"] {
  if (status === "in_progress") {
    return "in_progress"
  }

  if (status === "blocked") {
    return "awaiting_vendor"
  }

  return "scheduled"
}

function toMaintenancePriority(priority: string): MaintenanceTicket["priority"] {
  if (priority === "low") {
    return "low"
  }

  if (priority === "high" || priority === "urgent") {
    return "high"
  }

  return "medium"
}

function toBookingStatus(status: string): UpcomingBooking["status"] {
  if (status === "confirmed") {
    return "confirmed"
  }

  if (status === "pending") {
    return "pending"
  }

  return "waitlisted"
}

function buildFallbackFloorplanWorkspace(currentUserId: string, currentUserRole: FloorplanWorkspace["currentUserRole"]): FloorplanWorkspace {
  return {
    floorplanId: "fallback-floorplan",
    floorplanName: "Unit floorplan",
    propertyId: "",
    unitId: "",
    svgMarkup:
      '<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Floorplan coming soon"><rect width="100" height="60" fill="#0f172a" /><text x="50" y="32" text-anchor="middle" fill="#e2e8f0" font-size="6">Floorplan not uploaded yet</text></svg>',
    currentVersion: 1,
    currentUserId,
    currentUserRole,
    roommates: [],
    annotations: [],
    annotationHistory: [],
  }
}

async function getCurrentUserId() {
  const supabase = await createSupbaseServerClientReadOnly()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return {
    supabase,
    user,
  }
}

export async function fetchProductionWelcomeMessage(): Promise<WelcomeMessage> {
  const { user } = await getCurrentUserId()

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? DEFAULT_USER_NAME

  return {
    title: `Welcome back, ${firstName}`,
    subtitle: "Here’s your latest roommate activity and property operations snapshot.",
    primaryAction: {
      href: "/payments",
      label: "Review rent",
    },
    secondaryAction: {
      href: "/bookings",
      label: "Check bookings",
    },
  }
}

export async function fetchProductionRentSummary(): Promise<RentSummary> {
  const { supabase, user } = await getCurrentUserId()

  if (!user) {
    return getInitialRentSummary()
  }

  const { data: latestPayments, error } = await supabase
    .from("rent_payments")
    .select("amount, status, created_at, due_date, metadata")
    .eq("tenant_id", user.id)
    .order("created_at", { ascending: false })
    .limit(6)

  if (error || !latestPayments?.length) {
    return getInitialRentSummary()
  }

  const latest = latestPayments[0]
  const successfulPayment = latestPayments.find((payment) => payment.status === "succeeded" || payment.status === "completed")

  const amount = Number(latest.amount ?? 0)
  const autopayEnabled = Boolean(latest.metadata && typeof latest.metadata === "object" && "autopay_enabled" in latest.metadata ? (latest.metadata as Record<string, unknown>).autopay_enabled : false)

  return {
    amount,
    dueDate: latest.due_date ?? getInitialRentSummary().dueDate,
    autopayEnabled,
    balance: successfulPayment ? 0 : amount,
    lastPaymentDate: successfulPayment?.created_at ?? "",
    status: computeRentStatus(amount, latest.due_date ?? null, Boolean(successfulPayment)),
  }
}

export async function fetchProductionRecentDocuments(): Promise<DocumentSummary[]> {
  const { supabase, user } = await getCurrentUserId()

  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from("documents")
    .select("id, title, document_type, status, updated_at")
    .eq("tenant_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(5)

  if (error || !data) {
    return []
  }

  return data.map((document) => ({
    name: document.title,
    href: "/documents",
    category: document.document_type,
    status: toDocumentStatus(document.status),
    updatedAt: document.updated_at ?? new Date().toISOString(),
  }))
}

export async function fetchProductionRoommateUpdates(): Promise<RoommateUpdate[]> {
  const supabase = await createSupbaseServerClientReadOnly()

  const { data, error } = await supabase
    .from("threads")
    .select("id, title, body, created_at, author_id, profiles!threads_author_id_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(5)

  if (error || !data) {
    return []
  }

  return data.map((thread) => {
    const profileJoin = thread.profiles
    const joinedProfile = Array.isArray(profileJoin) ? profileJoin[0] : profileJoin

    return {
      id: thread.id,
      author: joinedProfile?.full_name ?? "Roommate",
      message: thread.body ?? thread.title,
      timestamp: thread.created_at ?? new Date().toISOString(),
      topic: "logistics",
    }
  })
}

export async function fetchProductionDashboardMetrics(): Promise<DashboardMetric[]> {
  const [rentSummary, bookings, updates, maintenance] = await Promise.all([
    fetchProductionRentSummary(),
    fetchProductionUpcomingBookings(),
    fetchProductionRoommateUpdates(),
    fetchProductionMaintenanceTickets(),
  ])

  return [
    {
      id: "rent",
      label: "This month’s rent",
      value: formatCurrency(rentSummary.amount),
      helperText:
        rentSummary.status === "paid"
          ? "Payment posted"
          : `Due ${rentSummary.dueDate}`,
      trend: {
        direction: rentSummary.status === "overdue" ? "down" : "neutral",
        label: rentSummary.autopayEnabled ? "Autopay enabled" : "Manual payment",
      },
      icon: "rent",
    },
    {
      id: "calendar",
      label: "Upcoming bookings",
      value: String(bookings.length),
      helperText: bookings.length ? `${bookings[0].amenity} next` : "No upcoming reservations",
      trend: {
        direction: bookings.length > 0 ? "up" : "neutral",
        label: "Synced from booking schedule",
      },
      icon: "calendar",
    },
    {
      id: "roommates",
      label: "Roommate updates",
      value: String(updates.length),
      helperText: "Recent discussion threads",
      trend: {
        direction: updates.length > 0 ? "up" : "neutral",
        label: "Realtime board activity",
      },
      icon: "roommates",
    },
    {
      id: "maintenance",
      label: "Open maintenance",
      value: String(maintenance.length),
      helperText: "Requests requiring follow-up",
      trend: {
        direction: maintenance.some((ticket) => ticket.priority === "high") ? "down" : "neutral",
        label: maintenance.some((ticket) => ticket.priority === "high") ? "High-priority issue present" : "No critical blockers",
      },
      icon: "maintenance",
    },
  ]
}

export async function fetchProductionQuickActions(): Promise<QuickAction[]> {
  const { supabase, user } = await getCurrentUserId()

  if (!user) {
    return [
      {
        id: "amenity",
        label: "Reserve amenity",
        description: "Book kitchen, TV room, parking, and more",
        href: "/bookings",
      },
      {
        id: "visitor",
        label: "Register visitor",
        description: "Submit overnight guest stay details",
        href: "/visitors",
      },
    ]
  }

  const [pendingDocuments, pendingBookings, pendingMaintenance] = await Promise.all([
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", user.id)
      .eq("status", "pending_signature"),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", user.id)
      .eq("status", "pending"),
    supabase
      .from("maintenance_requests")
      .select("id", { count: "exact", head: true })
      .eq("created_by", user.id)
      .not("status", "in", "(resolved,cancelled,completed)"),
  ])

  const needsDocumentReview = Boolean(pendingDocuments.count)
  const hasPendingBooking = Boolean(pendingBookings.count)
  const hasOpenMaintenance = Boolean(pendingMaintenance.count)

  return [
    {
      id: "payments",
      label: "Record payment",
      description: "Log or retry a rent payment",
      href: "/payments",
    },
    {
      id: "amenity",
      label: hasPendingBooking ? "Review booking" : "Reserve amenity",
      description: hasPendingBooking
        ? "Pending amenity request needs confirmation"
        : "Book kitchen, TV room, parking, and more",
      href: "/bookings",
    },
    {
      id: needsDocumentReview ? "documents" : "visitor",
      label: needsDocumentReview ? "Sign lease docs" : "Register visitor",
      description: needsDocumentReview
        ? "A document is waiting for your signature"
        : hasOpenMaintenance
          ? "Track existing maintenance requests"
          : "Submit overnight guest stay details",
      href: needsDocumentReview ? "/documents" : hasOpenMaintenance ? "/maintenance" : "/visitors",
    },
  ]
}

export async function fetchProductionUpcomingBookings(): Promise<UpcomingBooking[]> {
  const { supabase, user } = await getCurrentUserId()

  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("id, amenity_name, start_time, end_time, status")
    .eq("tenant_id", user.id)
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(5)

  if (error || !data) {
    return []
  }

  return data.map((booking) => {
    const start = new Date(booking.start_time)
    const end = new Date(booking.end_time)

    return {
      id: booking.id,
      amenity: booking.amenity_name,
      date: start.toISOString().slice(0, 10),
      timeframe: `${start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} – ${end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
      status: toBookingStatus(booking.status),
    }
  })
}

export async function fetchProductionMaintenanceTickets(): Promise<MaintenanceTicket[]> {
  const { supabase, user } = await getCurrentUserId()

  if (!user) {
    return []
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("unit_id")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.unit_id) {
    return []
  }

  const { data, error } = await supabase
    .from("maintenance_requests")
    .select("id, title, status, priority, updated_at")
    .eq("unit_id", profile.unit_id)
    .not("status", "in", "(resolved,cancelled,completed)")
    .order("updated_at", { ascending: false })
    .limit(5)

  if (error || !data) {
    return []
  }

  return data.map((ticket) => ({
    id: ticket.id,
    title: ticket.title,
    status: toMaintenanceStatus(ticket.status),
    priority: toMaintenancePriority(ticket.priority),
    updatedAt: ticket.updated_at ?? new Date().toISOString(),
  }))
}

export async function fetchProductionFloorplanWorkspace(): Promise<FloorplanWorkspace> {
  const { supabase, user } = await getCurrentUserId()

  if (!user) {
    return buildFallbackFloorplanWorkspace("", "tenant")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("unit_id, role")
    .eq("id", user.id)
    .maybeSingle()

  const currentUserRole = (profile?.role ?? "tenant") as FloorplanWorkspace["currentUserRole"]

  if (!profile?.unit_id) {
    return buildFallbackFloorplanWorkspace(user.id, currentUserRole)
  }

  const { data: floorplan } = await supabase
    .from("floorplans")
    .select("id, name, unit_id, property_id, version, svg_url")
    .eq("unit_id", profile.unit_id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: roommates } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("unit_id", profile.unit_id)

  const { data: rawAnnotations } = floorplan
    ? await supabase
        .from("floorplan_annotations")
        .select("id, profile_id, annotation_key, annotation_value, updated_at")
        .eq("floorplan_id", floorplan.id)
    : { data: null }

  const annotations: FloorplanAnnotation[] = (rawAnnotations ?? []).map((item) => {
    const annotationValue = (item.annotation_value && typeof item.annotation_value === "object"
      ? (item.annotation_value as Record<string, unknown>)
      : {})

    const markerType = annotationValue.markerType
    const scope = annotationValue.visibilityScope

    return {
      id: item.id,
      markerType: markerType === "storage" || markerType === "chore" ? markerType : "room",
      label: String(annotationValue.label ?? item.annotation_key),
      note: annotationValue.note ? String(annotationValue.note) : null,
      x: Number(annotationValue.x ?? 50),
      y: Number(annotationValue.y ?? 50),
      createdBy: item.profile_id ?? user.id,
      visibilityScope:
        scope === "private" || scope === "selected_roommates" ? scope : "all_roommates",
      visibleToUserIds: Array.isArray(annotationValue.visibleToUserIds)
        ? (annotationValue.visibleToUserIds as string[])
        : [],
      version: Number(annotationValue.version ?? 1),
      updatedAt: item.updated_at ?? new Date().toISOString(),
    }
  })

  if (!floorplan) {
    return {
      ...buildFallbackFloorplanWorkspace(user.id, currentUserRole),
      unitId: profile.unit_id,
      roommates: (roommates ?? []).map((roommate) => ({
        id: roommate.id,
        name: roommate.full_name ?? "Roommate",
        role: (roommate.role ?? "tenant") as FloorplanWorkspace["currentUserRole"],
      })),
    }
  }

  return {
    floorplanId: floorplan.id,
    floorplanName: floorplan.name,
    propertyId: floorplan.property_id,
    unitId: floorplan.unit_id ?? profile.unit_id,
    svgMarkup: floorplan.svg_url,
    currentVersion: floorplan.version,
    currentUserId: user.id,
    currentUserRole,
    roommates: (roommates ?? []).map((roommate) => ({
      id: roommate.id,
      name: roommate.full_name ?? "Roommate",
      role: (roommate.role ?? "tenant") as FloorplanWorkspace["currentUserRole"],
    })),
    annotations,
    annotationHistory: annotations.map((annotation) => ({
      id: `${annotation.id}-created`,
      annotationId: annotation.id,
      action: "created",
      version: annotation.version,
      changedBy: annotation.createdBy,
      changedAt: annotation.updatedAt,
      snapshot: annotation,
    })),
  }
}
