import { formatISO, subMonths } from "date-fns"
import { redirect } from "next/navigation"

import { createSupbaseServerClient } from "@/utils/supaone"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

import { canViewWidget } from "./access"
import {
  BuildingAccess,
  BuildingRole,
  DashboardData,
} from "./types"

type DashboardContext = {
  supabase: TypedSupabaseClient
  userId: string
  buildings: BuildingAccess[]
  activeBuilding: BuildingAccess
}

export async function getDashboardContext({
  searchParams,
  currentPath,
}: {
  searchParams: { building?: string }
  currentPath: string
}): Promise<DashboardContext> {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  const { data: assignments, error } = await supabase
    .from("user_building_roles")
    .select("building_id, role, building:buildings(name)")
    .eq("user_id", user!.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(`Failed to load building access: ${error.message}`)
  }

  if (!assignments || assignments.length === 0) {
    throw new Error("User has no building assignments")
  }

  const buildings: BuildingAccess[] = assignments.map((item) => ({
    id: item.building_id,
    name: item.building?.name ?? "Unassigned Building",
    role: normalizeRole(item.role),
  }))

  const requestedBuilding = searchParams.building
  const activeBuilding = buildings.find((building) =>
    requestedBuilding ? building.id === requestedBuilding : false,
  )

  if (!activeBuilding) {
    redirect(`${currentPath}?building=${buildings[0]!.id}`)
  }

  return {
    supabase,
    userId: user!.id,
    buildings,
    activeBuilding: activeBuilding!,
  }
}

export async function fetchDashboardData(
  client: TypedSupabaseClient,
  buildingId: string,
): Promise<DashboardData> {
  const sixMonthsAgo = subMonths(new Date(), 6)
  const rentRangeStart = formatISO(sixMonthsAgo, { representation: "date" })
  const nowIso = new Date().toISOString()

  const [rentPayments, bookings, maintenance, visitors, documents, messages] =
    await Promise.all([
      client
        .from("rent_payments")
        .select("*")
        .eq("building_id", buildingId)
        .gte("due_date", rentRangeStart),
      client
        .from("bookings")
        .select("*, amenities(name)")
        .eq("building_id", buildingId)
        .gte("starts_at", nowIso)
        .in("status", ["confirmed", "pending"])
        .order("starts_at", { ascending: true })
        .limit(15),
      client
        .from("maintenance_requests")
        .select("*")
        .eq("building_id", buildingId)
        .not("status", "in", "(completed,cancelled)")
        .order("submitted_at", { ascending: false })
        .limit(50),
      client
        .from("visitor_logs")
        .select("*")
        .eq("building_id", buildingId)
        .order("arrival_date", { ascending: true })
        .limit(50),
      client
        .from("document_approvals")
        .select("*")
        .eq("building_id", buildingId)
        .order("requested_at", { ascending: false })
        .limit(50),
      client
        .from("messages")
        .select("*, threads(title)")
        .eq("building_id", buildingId)
        .order("created_at", { ascending: false })
        .limit(25),
    ])

  const errors = [
    rentPayments.error,
    bookings.error,
    maintenance.error,
    visitors.error,
    documents.error,
    messages.error,
  ].filter(Boolean)

  if (errors.length) {
    throw new Error(errors.map((err) => err!.message).join(" | "))
  }

  return {
    rentPayments: rentPayments.data ?? [],
    bookings: bookings.data ?? [],
    maintenance: maintenance.data ?? [],
    visitors: visitors.data ?? [],
    documents: documents.data ?? [],
    messages: messages.data ?? [],
  }
}

export function filterDataByRole<T extends DashboardData>(
  data: T,
  role: BuildingRole,
): T {
  const result = { ...data }

  if (!canViewWidget(role, "rent")) {
    result.rentPayments = []
  }
  if (!canViewWidget(role, "bookings")) {
    result.bookings = []
  }
  if (!canViewWidget(role, "maintenance")) {
    result.maintenance = []
  }
  if (!canViewWidget(role, "visitors")) {
    result.visitors = []
  }
  if (!canViewWidget(role, "documents")) {
    result.documents = []
  }
  if (!canViewWidget(role, "messages")) {
    result.messages = []
  }

  return result
}

function normalizeRole(value: string | null): BuildingRole {
  switch (value) {
    case "platform_admin":
    case "property_manager":
    case "building_staff":
    case "support_agent":
    case "resident":
      return value
    default:
      return "property_manager"
  }
}

