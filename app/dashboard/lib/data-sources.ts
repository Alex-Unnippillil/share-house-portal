import { SupabaseClient } from "@supabase/supabase-js"

import { Database } from "@/lib/supabase"

export type DashboardRole = "property_manager" | "admin"

export type BuildingSummary = {
  id: string
  name: string
}

export type DashboardAccessContext = {
  supabase: SupabaseClient<Database>
  profile: {
    id: string
    role: string | null
    full_name?: string | null
  }
  buildings: BuildingSummary[]
}

export type RentCollectionSummary = {
  buildingId: string
  totalDue: number
  totalCollected: number
  delinquentCount: number
  autopayCount: number
  breakdown: Record<string, number>
  upcoming: Array<{
    id: string
    residentName: string
    amount: number
    dueDate: string
    status: string
  }>
}

export type AmenityBookingSummary = {
  id: string
  amenityName: string
  startTime: string
  endTime: string
  status: string
  residentName: string
}

export type MaintenanceQueue = {
  buildingId: string
  metrics: {
    totalOpen: number
    highPriority: number
    awaitingAssignment: number
  }
  requests: Array<{
    id: string
    title: string
    priority: string
    status: string
    submittedAt: string
    assignedTo: string | null
  }>
}

export type VisitorApproval = {
  id: string
  visitorName: string
  hostName: string | null
  arrivalDate: string
  notes: string | null
  approvalStatus: string
}

export type DocumentApproval = {
  id: string
  documentTitle: string
  residentName: string | null
  status: string
  submittedAt: string
}

export type MessageAlert = {
  id: string
  subject: string
  lastActivityAt: string
  unresolved: boolean
  unreadCount: number
}

export type BuildingAnalytics = {
  buildingId: string
  rentCollectionByMonth: Array<{
    month: string
    collected: number
    outstanding: number
  }>
  amenityBookingsByAmenity: Array<{
    amenity: string
    count: number
  }>
  maintenanceByPriority: Record<string, number>
}

const MANAGER_ROLES: DashboardRole[] = ["property_manager", "admin"]

function assertManagerRole(role: string): asserts role is DashboardRole {
  if (!MANAGER_ROLES.includes(role as DashboardRole)) {
    throw new Error("forbidden")
  }
}

function ensureBuildingAccess(buildings: BuildingSummary[], buildingId: string) {
  const hasAccess = buildings.some((building) => building.id === buildingId)
  if (!hasAccess) {
    throw new Error("building_access_denied")
  }
}

export async function resolveAccessContext(
  supabase: SupabaseClient<Database>,
  requestedBuildingId?: string | null
): Promise<{ context: DashboardAccessContext; activeBuilding: BuildingSummary }> {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData?.user) {
    throw new Error("unauthenticated")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", authData.user.id)
    .single()

  if (profileError || !profile) {
    throw new Error("profile_not_found")
  }

  assertManagerRole(profile.role ?? "")

  let buildings: BuildingSummary[] = []

  if (profile.role === "admin") {
    const { data: buildingRows, error: buildingError } = await supabase
      .from("buildings")
      .select("id, name")
      .order("name", { ascending: true })

    if (buildingError) {
      throw new Error(buildingError.message)
    }

    buildings = (buildingRows ?? []).map((row) => ({
      id: row.id,
      name: row.name,
    }))
  } else {
    const { data: assignmentRows, error: assignmentError } = await supabase
      .from("building_staff_assignments")
      .select("building_id, building_name")
      .eq("profile_id", profile.id)

    if (assignmentError) {
      throw new Error(assignmentError.message)
    }

    buildings = (assignmentRows ?? []).map((row) => ({
      id: row.building_id,
      name: row.building_name ?? `Building ${row.building_id.slice(0, 6)}`,
    }))
  }

  if (buildings.length === 0) {
    throw new Error("no_buildings_assigned")
  }

  const activeBuilding =
    (requestedBuildingId && buildings.find((building) => building.id === requestedBuildingId)) ||
    buildings[0]

  return {
    context: {
      supabase,
      profile,
      buildings,
    },
    activeBuilding,
  }
}

export async function fetchRentCollectionSummary(
  context: DashboardAccessContext,
  buildingId: string
): Promise<RentCollectionSummary> {
  assertManagerRole(context.profile.role ?? "")
  ensureBuildingAccess(context.buildings, buildingId)

  const { data, error } = await context.supabase
    .from("rent_payments")
    .select("id, amount, status, due_date, paid_at, autopay_enrolled, resident_name")
    .match({ building_id: buildingId })

  if (error) {
    throw new Error(error.message)
  }

  const payments = data ?? []

  const totalCollected = payments
    .filter((payment) => payment.status === "paid")
    .reduce((total, payment) => total + payment.amount, 0)

  const totalDue = payments.reduce((total, payment) => total + payment.amount, 0)

  const delinquentCount = payments.filter((payment) => payment.status === "overdue").length
  const autopayCount = payments.filter((payment) => payment.autopay_enrolled).length

  const breakdown = payments.reduce<Record<string, number>>((acc, payment) => {
    acc[payment.status] = (acc[payment.status] ?? 0) + payment.amount
    return acc
  }, {})

  const upcoming = payments
    .filter((payment) => payment.status !== "paid")
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5)
    .map((payment) => ({
      id: payment.id,
      residentName: payment.resident_name ?? "Resident",
      amount: payment.amount,
      dueDate: payment.due_date,
      status: payment.status,
    }))

  return {
    buildingId,
    totalDue,
    totalCollected,
    delinquentCount,
    autopayCount,
    breakdown,
    upcoming,
  }
}

export async function fetchUpcomingBookings(
  context: DashboardAccessContext,
  buildingId: string
): Promise<AmenityBookingSummary[]> {
  assertManagerRole(context.profile.role ?? "")
  ensureBuildingAccess(context.buildings, buildingId)

  const { data, error } = await context.supabase
    .from("amenity_bookings")
    .select("id, amenity_name, start_time, end_time, status, resident_name")
    .match({ building_id: buildingId })

  if (error) {
    throw new Error(error.message)
  }

  const now = Date.now()

  return (data ?? [])
    .filter((booking) => new Date(booking.start_time).getTime() >= now)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 5)
    .map((booking) => ({
      id: booking.id,
      amenityName: booking.amenity_name,
      startTime: booking.start_time,
      endTime: booking.end_time,
      status: booking.status,
      residentName: booking.resident_name ?? "",
    }))
}

export async function fetchMaintenanceQueue(
  context: DashboardAccessContext,
  buildingId: string
): Promise<MaintenanceQueue> {
  assertManagerRole(context.profile.role ?? "")
  ensureBuildingAccess(context.buildings, buildingId)

  const { data, error } = await context.supabase
    .from("maintenance_requests")
    .select("id, title, priority, status, submitted_at, assigned_to")
    .match({ building_id: buildingId })

  if (error) {
    throw new Error(error.message)
  }

  const requests = (data ?? []).filter((request) => request.status !== "resolved")

  return {
    buildingId,
    metrics: {
      totalOpen: requests.length,
      highPriority: requests.filter((request) => request.priority === "high").length,
      awaitingAssignment: requests.filter((request) => !request.assigned_to).length,
    },
    requests: requests
      .sort((a, b) => {
        if (a.priority === b.priority) {
          return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
        }
        return a.priority === "high" ? -1 : 1
      })
      .map((request) => ({
        id: request.id,
        title: request.title,
        priority: request.priority,
        status: request.status,
        submittedAt: request.submitted_at,
        assignedTo: request.assigned_to,
      })),
  }
}

export async function fetchVisitorApprovals(
  context: DashboardAccessContext,
  buildingId: string
): Promise<VisitorApproval[]> {
  assertManagerRole(context.profile.role ?? "")
  ensureBuildingAccess(context.buildings, buildingId)

  const { data, error } = await context.supabase
    .from("visitor_logs")
    .select("id, visitor_name, host_name, arrival_date, notes, approval_status")
    .match({ building_id: buildingId })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? [])
    .filter((visitor) => visitor.approval_status !== "approved")
    .sort((a, b) => new Date(a.arrival_date).getTime() - new Date(b.arrival_date).getTime())
    .map((visitor) => ({
      id: visitor.id,
      visitorName: visitor.visitor_name,
      hostName: visitor.host_name,
      arrivalDate: visitor.arrival_date,
      notes: visitor.notes,
      approvalStatus: visitor.approval_status,
    }))
}

export async function fetchDocumentApprovals(
  context: DashboardAccessContext,
  buildingId: string
): Promise<DocumentApproval[]> {
  assertManagerRole(context.profile.role ?? "")
  ensureBuildingAccess(context.buildings, buildingId)

  const { data, error } = await context.supabase
    .from("document_workflows")
    .select("id, document_title, resident_name, status, submitted_at")
    .match({ building_id: buildingId })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? [])
    .filter((document) => document.status !== "completed")
    .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())
    .map((document) => ({
      id: document.id,
      documentTitle: document.document_title,
      residentName: document.resident_name,
      status: document.status,
      submittedAt: document.submitted_at,
    }))
}

export async function fetchMessageAlerts(
  context: DashboardAccessContext,
  buildingId: string
): Promise<MessageAlert[]> {
  assertManagerRole(context.profile.role ?? "")
  ensureBuildingAccess(context.buildings, buildingId)

  const { data, error } = await context.supabase
    .from("message_threads")
    .select("id, subject, last_activity_at, unresolved, unread_count")
    .match({ building_id: buildingId })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? [])
    .sort((a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime())
    .slice(0, 5)
    .map((thread) => ({
      id: thread.id,
      subject: thread.subject,
      lastActivityAt: thread.last_activity_at,
      unresolved: thread.unresolved,
      unreadCount: thread.unread_count ?? 0,
    }))
}

export async function fetchBuildingAnalytics(
  context: DashboardAccessContext,
  buildingId: string
): Promise<BuildingAnalytics> {
  assertManagerRole(context.profile.role ?? "")
  ensureBuildingAccess(context.buildings, buildingId)

  const [{ data: payments, error: paymentsError }, { data: maintenance, error: maintenanceError }, { data: bookings, error: bookingsError }] =
    await Promise.all([
      context.supabase
        .from("rent_payments")
        .select("id, amount, status, due_date, paid_at")
        .match({ building_id: buildingId }),
      context.supabase
        .from("maintenance_requests")
        .select("id, priority, status")
        .match({ building_id: buildingId }),
      context.supabase
        .from("amenity_bookings")
        .select("id, amenity_name")
        .match({ building_id: buildingId }),
    ])

  if (paymentsError) {
    throw new Error(paymentsError.message)
  }
  if (maintenanceError) {
    throw new Error(maintenanceError.message)
  }
  if (bookingsError) {
    throw new Error(bookingsError.message)
  }

  const monthlyMap = new Map<
    string,
    {
      collected: number
      outstanding: number
    }
  >()

  ;(payments ?? []).forEach((payment) => {
    const monthKey = new Date(payment.due_date).toISOString().slice(0, 7)
    const existing = monthlyMap.get(monthKey) ?? { collected: 0, outstanding: 0 }
    if (payment.status === "paid") {
      existing.collected += payment.amount
    } else {
      existing.outstanding += payment.amount
    }
    monthlyMap.set(monthKey, existing)
  })

  const rentCollectionByMonth = Array.from(monthlyMap.entries())
    .sort(([monthA], [monthB]) => monthA.localeCompare(monthB))
    .map(([month, value]) => ({ month, ...value }))

  const maintenanceByPriority = (maintenance ?? []).reduce<Record<string, number>>((acc, request) => {
    if (request.status === "resolved") {
      return acc
    }
    acc[request.priority] = (acc[request.priority] ?? 0) + 1
    return acc
  }, {})

  const amenityBookingsByAmenity = (bookings ?? []).reduce<Record<string, number>>((acc, booking) => {
    acc[booking.amenity_name] = (acc[booking.amenity_name] ?? 0) + 1
    return acc
  }, {})

  return {
    buildingId,
    rentCollectionByMonth,
    amenityBookingsByAmenity: Object.entries(amenityBookingsByAmenity).map(([amenity, count]) => ({
      amenity,
      count,
    })),
    maintenanceByPriority,
  }
}
