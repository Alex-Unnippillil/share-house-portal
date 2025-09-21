import { BuildingRole, DashboardWidget } from "./types"

const widgetMatrix: Record<DashboardWidget, BuildingRole[]> = {
  rent: ["platform_admin", "property_manager"],
  bookings: ["platform_admin", "property_manager", "building_staff"],
  maintenance: ["platform_admin", "property_manager", "building_staff"],
  visitors: ["platform_admin", "property_manager", "building_staff"],
  documents: ["platform_admin", "property_manager"],
  messages: [
    "platform_admin",
    "property_manager",
    "building_staff",
    "support_agent",
  ],
  analytics: ["platform_admin", "property_manager"],
}

export function canViewWidget(role: BuildingRole, widget: DashboardWidget) {
  const allowed = widgetMatrix[widget]
  if (!allowed) return false
  return allowed.includes(role)
}

export function getAccessibleWidgets(role: BuildingRole) {
  return (Object.keys(widgetMatrix) as DashboardWidget[]).filter((widget) =>
    canViewWidget(role, widget),
  )
}

export function getRoleLabel(role: BuildingRole) {
  switch (role) {
    case "platform_admin":
      return "Platform Admin"
    case "property_manager":
      return "Property Manager"
    case "building_staff":
      return "Building Staff"
    case "support_agent":
      return "Support Agent"
    case "resident":
      return "Resident"
    default:
      return role
  }
}

