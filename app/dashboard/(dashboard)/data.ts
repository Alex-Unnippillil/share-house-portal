import "server-only"

import { cache } from "react"

import type { MemberProfile, MemberRole } from "@/lib/data/members"
import {
  fetchMemberHousingContext,
  fetchManagerPortfolio,
  type ManagerPortfolio,
  type MemberHousingContext,
  type PropertySummary,
} from "@/lib/data/property-management"
import type { Database } from "@/lib/supabase"
import { createSupbaseServerClientReadOnly } from "@/utils/supaone"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

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
  balanceLabel: string
  lastPaymentDate: string
  status: "due_soon" | "overdue" | "paid"
  unitLabel: string
  scopeLabel: string
  highlight: string
}

type DocumentSummary = {
  id: string
  name: string
  href: string
  category: string
  status: "action_required" | "viewed" | "new"
  updatedAt: string
  unitLabel?: string | null
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
  location: string
}

type MaintenanceTicket = {
  id: string
  title: string
  status: "scheduled" | "in_progress" | "awaiting_vendor"
  priority: "low" | "medium" | "high"
  updatedAt: string
  unitLabel: string | null
}

type DashboardAudience = "resident" | "manager"

type UnitOverviewMember = {
  id: string
  name: string
  email: string | null
  role: MemberRole | null
  roleLabel: string
  rentShareLabel: string | null
  isYou: boolean
}

type UnitOverview = {
  status: "assigned" | "unassigned"
  unitLabel: string
  propertyLabel: string
  addressLines: string[]
  occupancySummary: string
  highlight: string | null
  members: UnitOverviewMember[]
  propertyManager: {
    name: string
    email: string | null
  } | null
  cta: {
    href: string
    label: string
  }
}

type PortfolioHighlight = {
  id: string
  name: string
  location: string | null
  occupancySummary: string
  occupancyRate: number
  totalUnits: number
  occupiedUnits: number
  residentCount: number
}

type PortfolioOverview = {
  propertyCount: number
  unitCount: number
  occupiedUnits: number
  vacancyCount: number
  occupancyRate: number
  totalResidents: number
  highlight: string | null
  featuredProperty: PortfolioHighlight | null
  cta: {
    href: string
    label: string
  }
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

function formatCurrency(amount: number) {
  if (!Number.isFinite(amount)) {
    return currencyFormatter.format(0)
  }
  return currencyFormatter.format(Math.max(0, Math.round(amount)))
}

function displayName(member?: MemberProfile | null) {
  return member?.full_name || member?.email || "Roommate"
}

const rentShareFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
})

function mapRoleLabel(role: MemberRole | null) {
  switch (role) {
    case "tenant":
      return "Leaseholder"
    case "roommate":
      return "Roommate"
    case "property_manager":
      return "Property manager"
    case "admin":
      return "Admin"
    default:
      return "Member"
  }
}

function formatRentShareLabel(share?: number | null) {
  if (share === null || share === undefined || Number.isNaN(share)) {
    return null
  }
  return `${rentShareFormatter.format(share)}% rent share`
}

function formatAddressLines(property?: Pick<
  PropertySummary,
  "addressLine1" | "addressLine2" | "city" | "state" | "postalCode" | "country"
> | null) {
  if (!property) {
    return []
  }

  const lines: string[] = []
  if (property.addressLine1) {
    lines.push(property.addressLine1)
  }
  if (property.addressLine2) {
    lines.push(property.addressLine2)
  }

  const cityLine = [property.city, property.state, property.postalCode]
    .filter(Boolean)
    .join(", ")

  if (cityLine) {
    lines.push(cityLine)
  }

  if (property.country) {
    lines.push(property.country)
  }

  return lines
}

function isManagerRole(role: MemberRole | null): role is "property_manager" | "admin" {
  return role === "property_manager" || role === "admin"
}

function makeUnitLabel(propertyName?: string | null, unitNumber?: string | null) {
  if (propertyName && unitNumber) {
    return `${propertyName} • Unit ${unitNumber}`
  }
  if (unitNumber) {
    return `Unit ${unitNumber}`
  }
  return propertyName || "Household"
}

function formatDocumentType(type?: string | null) {
  if (!type) {
    return "Document"
  }
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}
function mapDocumentStatus(
  status?: string | null,
  requiresSignature?: boolean | null
): DocumentSummary["status"] {
  if (requiresSignature && status === "pending_signature") {
    return "action_required"
  }
  if (status === "pending_signature") {
    return "action_required"
  }
  if (status === "signed" || status === "expired" || status === "cancelled") {
    return "viewed"
  }
  return "new"
}

function throwOnError(error: { message: string } | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`)
  }
}

function getNextDueDate() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 1)
}

function getPreviousPaymentDate(nextDue: Date) {
  return new Date(nextDue.getFullYear(), nextDue.getMonth() - 1, 1)
}

function computeRentShare(context: MemberHousingContext) {
  const rentAmount = context.unit?.rentAmount ?? 0
  const coResidents = context.roommates.filter(
    (member) => member.role === "tenant" || member.role === "roommate"
  )
  const includesSelf = coResidents.some((member) => member.id === context.profile?.id)
  const occupantCount = includesSelf
    ? coResidents.length
    : coResidents.length + (context.unit ? 1 : 0)
  const roommateCount = Math.max(occupantCount - 1, 0)
  const sharePercentage = context.profile?.rent_share ?? null

  let amount = rentAmount
  if (sharePercentage !== null && !Number.isNaN(sharePercentage)) {
    amount = rentAmount * (sharePercentage / 100)
  } else if (occupantCount > 0) {
    amount = rentAmount / occupantCount
  }

  return { amount, roommateCount, coResidents, sharePercentage }
}

function getPortfolioUnitIds(portfolio: ManagerPortfolio | null) {
  if (!portfolio) {
    return [] as string[]
  }

  const unitSet = new Set<string>()
  for (const property of portfolio.properties) {
    for (const unit of property.units) {
      if (unit.summary.id) {
        unitSet.add(unit.summary.id)
      }
    }
  }

  return Array.from(unitSet)
}

function buildUnitLabelMap(
  context: MemberHousingContext,
  portfolio: ManagerPortfolio | null
) {
  const map: Record<string, string> = {}

  if (context.unit) {
    map[context.unit.id] = makeUnitLabel(
      context.property?.name ?? null,
      context.unit.unitNumber
    )
  }

  if (portfolio) {
    for (const property of portfolio.properties) {
      for (const unit of property.units) {
        map[unit.summary.id] = makeUnitLabel(
          property.summary.name,
          unit.summary.unitNumber
        )
      }
    }
  }

  return map
}

function mapMaintenanceStatus(status?: string | null): MaintenanceTicket["status"] {
  switch (status) {
    case "in_progress":
      return "in_progress"
    case "pending":
      return "scheduled"
    default:
      return "awaiting_vendor"
  }
}

function mapMaintenancePriority(priority?: string | null): MaintenanceTicket["priority"] {
  switch (priority) {
    case "high":
    case "urgent":
      return "high"
    case "normal":
      return "medium"
    default:
      return "low"
  }
}

type MaintenanceRow = Database["public"]["Tables"]["maintenance_requests"]["Row"]
type DocumentRow = Database["public"]["Tables"]["documents"]["Row"]

const loadContext = cache(async () => {
  const supabase = await createSupbaseServerClientReadOnly()
  const typedSupabase = supabase as unknown as TypedSupabaseClient

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("User session not found")
  }

  const housingContext = await fetchMemberHousingContext(typedSupabase, user.id)

  return {
    supabase: typedSupabase,
    userId: user.id,
    housingContext,
  }
})

const loadPortfolio = cache(async () => {
  const { supabase, userId } = await loadContext()
  return fetchManagerPortfolio(supabase, userId)
})
async function getMaintenanceSummary(
  client: TypedSupabaseClient,
  unitIds: string[]
) {
  const filteredUnitIds = Array.from(new Set(unitIds.filter(Boolean))) as string[]

  if (!filteredUnitIds.length) {
    return { rows: [] as MaintenanceRow[], openCount: 0, urgentCount: 0 }
  }

  const { data, error } = await client
    .from("maintenance_requests")
    .select("id, title, status, priority, updated_at, created_at, unit_id")
    .in("status", ["pending", "in_progress"])
    .in("unit_id", filteredUnitIds)
    .order("updated_at", { ascending: false })
    .limit(20)

  throwOnError(error, "Failed to load maintenance requests")

  const rows = (data as MaintenanceRow[] | null | undefined) ?? []
  const openCount = rows.length
  const urgentCount = rows.filter(
    (row) => row.priority === "high" || row.priority === "urgent"
  ).length

  return { rows, openCount, urgentCount }
}

async function fetchWelcomeMessage(): Promise<WelcomeMessage> {
  const { housingContext } = await loadContext()

  if (isManagerRole(housingContext.role)) {
    const portfolio = await loadPortfolio()
    const propertyCount = portfolio.properties.length
    const propertyLabel = propertyCount === 1 ? "property" : "properties"
    const unitLabel = portfolio.totals.unitCount === 1 ? "unit" : "units"
    const managerName = displayName(housingContext.profile)

    return {
      title: `Welcome back, ${managerName}`,
      subtitle: propertyCount
        ? `You are overseeing ${portfolio.totals.unitCount} ${unitLabel} across ${propertyCount} ${propertyLabel}.`
        : "Assign yourself to a property to begin onboarding roommates.",
      primaryAction: {
        href: "/dashboard/members",
        label: "Manage residents",
      },
      secondaryAction: {
        href: "/maintenance",
        label: "Review maintenance",
      },
    }
  }

  const propertyName = housingContext.property?.name ?? "your household"
  const unitNumber = housingContext.unit?.unitNumber
  const residentName = displayName(housingContext.profile)

  return {
    title: `Welcome back, ${residentName}`,
    subtitle: housingContext.unit
      ? `Here’s what’s happening with ${propertyName}${unitNumber ? ` • Unit ${unitNumber}` : ""}.`
      : "Complete your profile to join your household and sync rent details.",
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

async function fetchRentSummary(): Promise<RentSummary> {
  const { housingContext } = await loadContext()
  const nextDue = getNextDueDate()
  const lastPayment = getPreviousPaymentDate(nextDue)

  if (isManagerRole(housingContext.role)) {
    const portfolio = await loadPortfolio()
    const totalRent = portfolio.properties.reduce((total, property) => {
      return (
        total +
        property.units.reduce((sum, unit) => sum + (unit.summary.rentAmount ?? 0), 0)
      )
    }, 0)
    const vacantUnits = Math.max(
      0,
      portfolio.totals.unitCount - portfolio.totals.occupiedUnits
    )
    const averageRent = portfolio.totals.unitCount
      ? totalRent / portfolio.totals.unitCount
      : 0
    const vacancyImpact = Math.round(vacantUnits * averageRent)

    return {
      amount: totalRent,
      dueDate: nextDue.toISOString(),
      autopayEnabled: false,
      balance: vacancyImpact,
      balanceLabel: "Projected vacancy impact",
      lastPaymentDate: lastPayment.toISOString(),
      status: "due_soon",
      unitLabel: `${portfolio.totals.unitCount} ${
        portfolio.totals.unitCount === 1 ? "unit" : "units"
      }`,
      scopeLabel: `${portfolio.totals.propertyCount} ${
        portfolio.totals.propertyCount === 1 ? "property" : "properties"
      }`,
      highlight: `${portfolio.totals.totalResidents} active ${
        portfolio.totals.totalResidents === 1 ? "resident" : "residents"
      }`,
    }
  }

  const { amount, roommateCount, sharePercentage } = computeRentShare(housingContext)
  const rentAmount = housingContext.unit?.rentAmount ?? 0
  const shareHighlight =
    sharePercentage !== null && !Number.isNaN(sharePercentage)
      ? `Your share: ${sharePercentage}% of ${formatCurrency(rentAmount)}`
      : roommateCount > 0
        ? `Split between ${roommateCount + 1} roommates`
        : housingContext.unit
          ? "Solo leaseholder"
          : "Complete onboarding to set rent share"
  const managerHighlight = housingContext.propertyManager
    ? `Managed by ${displayName(housingContext.propertyManager)}`
    : ""
  const combinedHighlight = managerHighlight
    ? `${shareHighlight} • ${managerHighlight}`
    : shareHighlight

  return {
    amount,
    dueDate: nextDue.toISOString(),
    autopayEnabled: sharePercentage !== null,
    balance: 0,
    balanceLabel: "Outstanding balance",
    lastPaymentDate: lastPayment.toISOString(),
    status: "due_soon",
    unitLabel: housingContext.unit?.unitNumber
      ? `Unit ${housingContext.unit.unitNumber}`
      : "Pending unit assignment",
    scopeLabel: housingContext.property?.name ?? "Household",
    highlight: combinedHighlight,
  }
}

async function fetchRecentDocuments(): Promise<DocumentSummary[]> {
  const { supabase, housingContext } = await loadContext()
  const limit = isManagerRole(housingContext.role) ? 6 : 3

  const { data, error } = await supabase
    .from("documents")
    .select(
      `
        id,
        title,
        document_type,
        status,
        updated_at,
        requires_signature,
        unit:units (
          unit_number,
          property:properties (
            name
          )
        )
      `
    )
    .order("updated_at", { ascending: false })
    .limit(limit)

  throwOnError(error, "Failed to load documents")

  const rows = (data as (DocumentRow & { unit?: any })[] | null | undefined) ?? []

  return rows.map((row) => {
    const category = formatDocumentType(row.document_type)
    const status = mapDocumentStatus(row.status, row.requires_signature)
    const updatedAt = row.updated_at || new Date().toISOString()
    const unitLabel = row.unit
      ? makeUnitLabel(row.unit.property?.name ?? null, row.unit.unit_number ?? null)
      : housingContext.property?.name ?? null

    return {
      id: row.id,
      name: row.title,
      href: `/documents/${row.id}`,
      category: unitLabel ? `${category} • ${unitLabel}` : category,
      status,
      updatedAt,
      unitLabel,
    }
  })
}

async function fetchRoommateUpdates(): Promise<RoommateUpdate[]> {
  const { supabase, housingContext } = await loadContext()
  const now = Date.now()

  if (isManagerRole(housingContext.role)) {
    const portfolio = await loadPortfolio()
    const unitIds = getPortfolioUnitIds(portfolio)
    const maintenanceSummary = await getMaintenanceSummary(supabase, unitIds)
    const primaryProperty = portfolio.properties[0]
    const propertyName = primaryProperty?.summary.name ?? "Portfolio"
    const busiestUnit = primaryProperty?.units.find((unit) => unit.members.length > 0)
    const leadResident = busiestUnit?.members[0]

    return [
      {
        id: "portfolio-occupancy",
        author: propertyName,
        message: `${portfolio.totals.occupiedUnits}/${portfolio.totals.unitCount} units filled. ${portfolio.totals.totalResidents} residents checked in this cycle.`,
        timestamp: new Date(now - 45 * 60 * 1000).toISOString(),
        topic: "announcement",
      },
      {
        id: "portfolio-maintenance",
        author: "Maintenance queue",
        message: maintenanceSummary.openCount
          ? `${maintenanceSummary.openCount} requests waiting (${maintenanceSummary.urgentCount} urgent). Assign follow-ups before the weekend.`
          : "No open maintenance tasks across the portfolio.",
        timestamp: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
        topic: "maintenance",
      },
      {
        id: "portfolio-resident",
        author: displayName(leadResident),
        message: busiestUnit
          ? `${displayName(leadResident)} confirmed their rent share for Unit ${busiestUnit.summary.unitNumber}.`
          : "Invite roommates to newly vacant units to keep occupancy strong.",
        timestamp: new Date(now - 20 * 60 * 60 * 1000).toISOString(),
        topic: "logistics",
      },
    ]
  }

  const unitId = housingContext.unit?.id
  const maintenanceSummary = unitId
    ? await getMaintenanceSummary(supabase, [unitId])
    : { rows: [], openCount: 0, urgentCount: 0 }

  const roommates = housingContext.roommates.filter(
    (member) =>
      member.id !== housingContext.profile?.id &&
      (member.role === "tenant" || member.role === "roommate")
  )
  const primaryRoommate = roommates[0] ?? null
  const secondaryRoommate = roommates[1] ?? housingContext.propertyManager ?? null

  return [
    {
      id: "pm-update",
      author: displayName(housingContext.propertyManager),
      message: `I'll stop by ${
        housingContext.unit?.unitNumber
          ? `Unit ${housingContext.unit.unitNumber}`
          : "your unit"
      } on ${new Date(now + 3 * 24 * 60 * 60 * 1000).toLocaleDateString()} for a quick walkthrough.`,
      timestamp: new Date(now - 60 * 60 * 1000).toISOString(),
      topic: "announcement",
    },
    {
      id: "roommate-grocery",
      author: displayName(primaryRoommate),
      message: `${displayName(primaryRoommate)} is planning a shared grocery run this weekend. Add requests before Friday night.`,
      timestamp: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
      topic: "logistics",
    },
    {
      id: "maintenance-followup",
      author: displayName(secondaryRoommate),
      message: maintenanceSummary.openCount
        ? `Maintenance update: ${maintenanceSummary.openCount} open item${
            maintenanceSummary.openCount === 1 ? "" : "s"
          }${
            maintenanceSummary.urgentCount
              ? ` • ${maintenanceSummary.urgentCount} urgent`
              : ""
          }.`
        : "No open maintenance requests. Log new issues anytime from the maintenance page.",
      timestamp: new Date(now - 22 * 60 * 60 * 1000).toISOString(),
      topic: "maintenance",
    },
  ]
}
async function fetchDashboardMetrics(): Promise<DashboardMetric[]> {
  const { supabase, housingContext } = await loadContext()

  if (isManagerRole(housingContext.role)) {
    const portfolio = await loadPortfolio()
    const unitIds = getPortfolioUnitIds(portfolio)
    const maintenanceSummary = await getMaintenanceSummary(supabase, unitIds)
    const totalRent = portfolio.properties.reduce((total, property) => {
      return (
        total +
        property.units.reduce((sum, unit) => sum + (unit.summary.rentAmount ?? 0), 0)
      )
    }, 0)
    const occupancyRate = portfolio.totals.unitCount
      ? Math.round(
          (portfolio.totals.occupiedUnits / Math.max(portfolio.totals.unitCount, 1)) *
            100
        )
      : 0

    return [
      {
        id: "rent",
        label: "Monthly rent under management",
        value: formatCurrency(totalRent),
        helperText: `${portfolio.totals.propertyCount} ${
          portfolio.totals.propertyCount === 1 ? "property" : "properties"
        }`,
        trend: { direction: "up", label: "Portfolio growth" },
        icon: "rent",
      },
      {
        id: "calendar",
        label: "Occupancy rate",
        value: `${occupancyRate}%`,
        helperText: `${portfolio.totals.occupiedUnits} of ${portfolio.totals.unitCount} units filled`,
        trend: { direction: "neutral", label: "Live portfolio" },
        icon: "calendar",
      },
      {
        id: "roommates",
        label: "Active residents",
        value: `${portfolio.totals.totalResidents}`,
        helperText: `Across ${portfolio.totals.unitCount} units`,
        trend: { direction: "up", label: "Resident engagement" },
        icon: "roommates",
      },
      {
        id: "maintenance",
        label: "Open maintenance",
        value: `${maintenanceSummary.openCount}`,
        helperText: maintenanceSummary.urgentCount
          ? `${maintenanceSummary.urgentCount} urgent tasks`
          : "All requests standard priority",
        trend: {
          direction: maintenanceSummary.openCount > 0 ? "up" : "down",
          label: maintenanceSummary.openCount > 0 ? "Attention needed" : "All clear",
        },
        icon: "maintenance",
      },
    ]
  }

  const { amount, roommateCount } = computeRentShare(housingContext)
  const propertyName = housingContext.property?.name ?? "Household"
  const unitLabel = housingContext.unit?.unitNumber
    ? `Unit ${housingContext.unit.unitNumber}`
    : "Set your unit"
  const maintenanceSummary = housingContext.unit
    ? await getMaintenanceSummary(supabase, [housingContext.unit.id])
    : { rows: [], openCount: 0, urgentCount: 0 }

  return [
    {
      id: "rent",
      label: "Your rent share",
      value: formatCurrency(amount),
      helperText: `${propertyName}${housingContext.unit ? ` • ${unitLabel}` : ""}`,
      trend: { direction: "neutral", label: "Autopay ready" },
      icon: "rent",
    },
    {
      id: "calendar",
      label: "Household roster",
      value: `${roommateCount + 1}`,
      helperText:
        roommateCount > 0
          ? `${roommateCount} roommate${roommateCount === 1 ? "" : "s"} sharing`
          : "Invite roommates to join",
      trend: {
        direction: roommateCount > 0 ? "up" : "neutral",
        label: roommateCount > 0 ? "Active household" : "Awaiting updates",
      },
      icon: "calendar",
    },
    {
      id: "roommates",
      label: "Property manager",
      value: housingContext.propertyManager
        ? displayName(housingContext.propertyManager)
        : "Unassigned",
      helperText: housingContext.propertyManager?.email || "Add contact details",
      trend: {
        direction: housingContext.propertyManager ? "up" : "down",
        label: housingContext.propertyManager ? "Available" : "Needs update",
      },
      icon: "roommates",
    },
    {
      id: "maintenance",
      label: "Maintenance requests",
      value: `${maintenanceSummary.openCount}`,
      helperText: maintenanceSummary.openCount
        ? `${maintenanceSummary.openCount} open${
            maintenanceSummary.urgentCount
              ? ` • ${maintenanceSummary.urgentCount} urgent`
              : ""
          }`
        : "All caught up",
      trend: {
        direction: maintenanceSummary.openCount ? "up" : "down",
        label: maintenanceSummary.openCount ? "Track progress" : "Clear queue",
      },
      icon: "maintenance",
    },
  ]
}

async function fetchQuickActions(): Promise<QuickAction[]> {
  const { supabase, housingContext } = await loadContext()

  if (isManagerRole(housingContext.role)) {
    const portfolio = await loadPortfolio()
    const unitIds = getPortfolioUnitIds(portfolio)
    const maintenanceSummary = await getMaintenanceSummary(supabase, unitIds)

    return [
      {
        id: "members",
        label: "Assign a roommate",
        description: "Invite tenants to open bedrooms",
        href: "/dashboard/members",
      },
      {
        id: "maintenance",
        label: "Review maintenance queue",
        description: maintenanceSummary.openCount
          ? `${maintenanceSummary.openCount} requests waiting`
          : "Nothing needs attention",
        href: "/maintenance",
      },
      {
        id: "documents",
        label: "Send lease update",
        description: "Distribute agreements for e-signature",
        href: "/documents",
      },
    ]
  }

  const propertyName = housingContext.property?.name ?? "your household"

  return [
    {
      id: "payments",
      label: "Record a payment",
      description: "Log or review rent receipts",
      href: "/payments",
    },
    {
      id: "amenity",
      label: "Reserve an amenity",
      description: `Book shared spaces at ${propertyName}`,
      href: "/schedule",
    },
    {
      id: "visitor",
      label: "Register a visitor",
      description: "Notify roommates and property manager",
      href: "/visitors",
    },
  ]
}

async function fetchUpcomingBookings(): Promise<UpcomingBooking[]> {
  const { housingContext } = await loadContext()
  const now = Date.now()

  if (isManagerRole(housingContext.role)) {
    const portfolio = await loadPortfolio()
    const events = portfolio.properties.flatMap((property) =>
      property.units.slice(0, 1).map((unit) => ({
        id: `${property.summary.id}-${unit.summary.id}-inspection`,
        amenity: `Move-in prep • Unit ${unit.summary.unitNumber}`,
        date: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString(),
        timeframe: "10:00 – 11:00 AM",
        status: unit.members.length > 0 ? "confirmed" : "pending",
        location: property.summary.name,
      }))
    )

    return events.slice(0, 3)
  }

  const propertyName = housingContext.property?.name ?? "Shared home"
  const unitLabel = housingContext.unit?.unitNumber
    ? `Unit ${housingContext.unit.unitNumber}`
    : propertyName

  return [
    {
      id: "amenity-kitchen",
      amenity: "Kitchen block",
      date: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString(),
      timeframe: "6:00 – 7:00 PM",
      status: "confirmed",
      location: propertyName,
    },
    {
      id: "amenity-tv",
      amenity: "TV room movie night",
      date: new Date(now + 4 * 24 * 60 * 60 * 1000).toISOString(),
      timeframe: "8:00 – 10:00 PM",
      status: "pending",
      location: unitLabel,
    },
    {
      id: "amenity-parking",
      amenity: "Guest parking reservation",
      date: new Date(now + 6 * 24 * 60 * 60 * 1000).toISOString(),
      timeframe: "All day",
      status: "confirmed",
      location: propertyName,
    },
  ]
}

async function fetchMaintenanceTickets(): Promise<MaintenanceTicket[]> {
  const { supabase, housingContext } = await loadContext()
  const portfolio = isManagerRole(housingContext.role) ? await loadPortfolio() : null
  const unitIds = portfolio
    ? getPortfolioUnitIds(portfolio)
    : housingContext.unit
      ? [housingContext.unit.id]
      : []
  const maintenanceSummary = await getMaintenanceSummary(supabase, unitIds)
  const unitLabels = buildUnitLabelMap(housingContext, portfolio)

  return maintenanceSummary.rows.slice(0, 3).map((ticket) => ({
    id: ticket.id,
    title: ticket.title ?? "Maintenance request",
    status: mapMaintenanceStatus(ticket.status),
    priority: mapMaintenancePriority(ticket.priority),
    updatedAt: ticket.updated_at ?? ticket.created_at ?? new Date().toISOString(),
    unitLabel: ticket.unit_id ? unitLabels[ticket.unit_id] ?? null : housingContext.property?.name ?? null,
  }))
}

async function fetchDashboardAudience(): Promise<DashboardAudience> {
  const { housingContext } = await loadContext()
  return isManagerRole(housingContext.role) ? "manager" : "resident"
}

async function fetchUnitOverview(): Promise<UnitOverview> {
  const { housingContext } = await loadContext()

  if (isManagerRole(housingContext.role)) {
    return {
      status: "unassigned",
      unitLabel: "Portfolio view",
      propertyLabel: "Switch to a resident profile",
      addressLines: [],
      occupancySummary: "Unit overview is available for residents with an assigned unit.",
      highlight: null,
      members: [],
      propertyManager: null,
      cta: {
        href: "/dashboard/members",
        label: "Manage residents",
      },
    }
  }

  const propertyLabel = housingContext.property?.name ?? "Your household"
  const addressLines = formatAddressLines(housingContext.property)
  const propertyManager = housingContext.propertyManager
    ? {
        name: displayName(housingContext.propertyManager),
        email: housingContext.propertyManager.email ?? null,
      }
    : null

  if (!housingContext.unit) {
    return {
      status: "unassigned",
      unitLabel: "Awaiting unit assignment",
      propertyLabel,
      addressLines,
      occupancySummary:
        "Complete onboarding to join your household and sync rent share details.",
      highlight: propertyManager ? `Managed by ${propertyManager.name}` : null,
      members: [],
      propertyManager,
      cta: {
        href: "/onboarding",
        label: "Continue onboarding",
      },
    }
  }

  const occupantProfiles: MemberProfile[] = []
  if (housingContext.profile) {
    occupantProfiles.push(housingContext.profile)
  }
  for (const roommate of housingContext.roommates) {
    if (!occupantProfiles.some((member) => member.id === roommate.id)) {
      occupantProfiles.push(roommate)
    }
  }

  const members = occupantProfiles
    .filter((member) => member.role === "tenant" || member.role === "roommate")
    .map<UnitOverviewMember>((member) => ({
      id: member.id,
      name: displayName(member),
      email: member.email ?? null,
      role: member.role ?? null,
      roleLabel: mapRoleLabel(member.role ?? null),
      rentShareLabel: formatRentShareLabel(member.rent_share ?? null),
      isYou: housingContext.profile?.id === member.id,
    }))
    .sort((a, b) => {
      if (a.isYou === b.isYou) {
        return a.name.localeCompare(b.name)
      }
      return a.isYou ? -1 : 1
    })

  const you = members.find((member) => member.isYou)
  const roommateCount = members.filter((member) => !member.isYou).length

  let occupancySummary = "No roommates have joined yet."
  if (members.length === 0) {
    occupancySummary = "No roommates have joined yet. Invite them to sync rent and chores."
  } else if (you) {
    occupancySummary = roommateCount
      ? `You and ${roommateCount} roommate${roommateCount === 1 ? "" : "s"} assigned`
      : "Solo leaseholder"
  } else {
    occupancySummary = `${members.length} active resident${members.length === 1 ? "" : "s"} assigned`
  }

  return {
    status: "assigned",
    unitLabel: makeUnitLabel(
      housingContext.property?.name ?? null,
      housingContext.unit.unitNumber
    ),
    propertyLabel,
    addressLines,
    occupancySummary,
    highlight: propertyManager ? `Managed by ${propertyManager.name}` : null,
    members,
    propertyManager,
    cta: {
      href: "/dashboard/members",
      label: members.length > 1 ? "View household roster" : "Invite roommates",
    },
  }
}

async function fetchPortfolioOverview(): Promise<PortfolioOverview> {
  const { housingContext } = await loadContext()

  if (!isManagerRole(housingContext.role)) {
    return {
      propertyCount: 0,
      unitCount: 0,
      occupiedUnits: 0,
      vacancyCount: 0,
      occupancyRate: 0,
      totalResidents: 0,
      highlight: "Switch to a manager profile to view portfolio insights.",
      featuredProperty: null,
      cta: {
        href: "/dashboard",
        label: "Back to dashboard",
      },
    }
  }

  const portfolio = await loadPortfolio()
  const vacancyCount = Math.max(
    portfolio.totals.unitCount - portfolio.totals.occupiedUnits,
    0
  )
  const occupancyRate = portfolio.totals.unitCount
    ? Math.round(
        (portfolio.totals.occupiedUnits / Math.max(portfolio.totals.unitCount, 1)) * 100
      )
    : 0

  let highlight: string | null = null
  if (portfolio.totals.propertyCount === 0) {
    highlight = "Assign yourself to a property to populate your portfolio."
  } else if (vacancyCount > 0) {
    highlight = `${vacancyCount} open ${vacancyCount === 1 ? "unit" : "units"} to fill`
  } else {
    highlight = "All units filled"
  }

  let featuredProperty: PortfolioHighlight | null = null
  if (portfolio.properties.length > 0) {
    const prioritized = [...portfolio.properties].sort((a, b) => {
      if (a.metrics.totalResidents === b.metrics.totalResidents) {
        return b.metrics.totalUnits - a.metrics.totalUnits
      }
      return b.metrics.totalResidents - a.metrics.totalResidents
    })[0]

    const locationLines = formatAddressLines(prioritized.summary)
    const occupancySummary = `${prioritized.metrics.occupiedUnits}/${prioritized.metrics.totalUnits} units filled • ${prioritized.metrics.totalResidents} residents`
    const propertyOccupancyRate = prioritized.metrics.totalUnits
      ? Math.round(
          (prioritized.metrics.occupiedUnits / Math.max(prioritized.metrics.totalUnits, 1)) *
            100
        )
      : 0

    featuredProperty = {
      id: prioritized.summary.id,
      name: prioritized.summary.name,
      location: locationLines[0] ?? prioritized.summary.name,
      occupancySummary,
      occupancyRate: propertyOccupancyRate,
      totalUnits: prioritized.metrics.totalUnits,
      occupiedUnits: prioritized.metrics.occupiedUnits,
      residentCount: prioritized.metrics.totalResidents,
    }
  }

  return {
    propertyCount: portfolio.totals.propertyCount,
    unitCount: portfolio.totals.unitCount,
    occupiedUnits: portfolio.totals.occupiedUnits,
    vacancyCount,
    occupancyRate,
    totalResidents: portfolio.totals.totalResidents,
    highlight,
    featuredProperty,
    cta: {
      href: "/dashboard/members",
      label: "Manage residents",
    },
  }
}

export const getWelcomeMessage = cache(fetchWelcomeMessage)
export function loadWelcomeMessageUncached() {
  return fetchWelcomeMessage()
}

export const getRentSummary = cache(fetchRentSummary)
export function loadRentSummaryUncached() {
  return fetchRentSummary()
}

export const getRecentDocuments = cache(fetchRecentDocuments)
export function loadRecentDocumentsUncached() {
  return fetchRecentDocuments()
}

export const getRoommateUpdates = cache(fetchRoommateUpdates)
export function loadRoommateUpdatesUncached() {
  return fetchRoommateUpdates()
}

export const getDashboardMetrics = cache(fetchDashboardMetrics)
export function loadDashboardMetricsUncached() {
  return fetchDashboardMetrics()
}

export const getQuickActions = cache(fetchQuickActions)
export function loadQuickActionsUncached() {
  return fetchQuickActions()
}

export const getUpcomingBookings = cache(fetchUpcomingBookings)
export function loadUpcomingBookingsUncached() {
  return fetchUpcomingBookings()
}

export const getMaintenanceTickets = cache(fetchMaintenanceTickets)
export function loadMaintenanceTicketsUncached() {
  return fetchMaintenanceTickets()
}

export const getDashboardAudience = cache(fetchDashboardAudience)
export function loadDashboardAudienceUncached() {
  return fetchDashboardAudience()
}

export const getUnitOverview = cache(fetchUnitOverview)
export function loadUnitOverviewUncached() {
  return fetchUnitOverview()
}

export const getPortfolioOverview = cache(fetchPortfolioOverview)
export function loadPortfolioOverviewUncached() {
  return fetchPortfolioOverview()
}

export type {
  DashboardAudience,
  DashboardMetric,
  DocumentSummary,
  PortfolioHighlight,
  PortfolioOverview,
  MaintenanceTicket,
  QuickAction,
  RentSummary,
  RoommateUpdate,
  UnitOverview,
  UnitOverviewMember,
  UpcomingBooking,
  WelcomeMessage,
}
