import type { LucideIcon } from "lucide-react";

export type AppRole = "resident" | "house_manager" | "platform_admin";

export const DEFAULT_ROLE: AppRole = "resident";

export const ROLE_LABELS: Record<AppRole, string> = {
  resident: "Resident",
  house_manager: "House Manager",
  platform_admin: "Platform Admin",
};

type Capability = {
  canManageMembers: boolean;
  canManageAmenities: boolean;
  canManageBookings: boolean;
  canManageVisitors: boolean;
  canManageLeases: boolean;
  canManageFloorplans: boolean;
  canManagePayments: boolean;
  canManageTodos: boolean;
};

export const ROLE_CAPABILITIES: Record<AppRole, Capability> = {
  resident: {
    canManageMembers: false,
    canManageAmenities: false,
    canManageBookings: false,
    canManageVisitors: false,
    canManageLeases: false,
    canManageFloorplans: false,
    canManagePayments: false,
    canManageTodos: true,
  },
  house_manager: {
    canManageMembers: true,
    canManageAmenities: true,
    canManageBookings: true,
    canManageVisitors: true,
    canManageLeases: true,
    canManageFloorplans: true,
    canManagePayments: true,
    canManageTodos: true,
  },
  platform_admin: {
    canManageMembers: true,
    canManageAmenities: true,
    canManageBookings: true,
    canManageVisitors: true,
    canManageLeases: true,
    canManageFloorplans: true,
    canManagePayments: true,
    canManageTodos: true,
  },
};

export type NavigationIconKey =
  | "dashboard"
  | "members"
  | "todos"
  | "amenities"
  | "bookings"
  | "visitors"
  | "leases"
  | "floorplans"
  | "payments";

export type NavItem = {
  href: string;
  label: string;
  description?: string;
  icon: NavigationIconKey;
  roles: AppRole[];
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Workspace",
    items: [
      {
        href: "/dashboard",
        label: "Overview",
        description: "Unified operating picture for your property.",
        icon: "dashboard",
        roles: ["resident", "house_manager", "platform_admin"],
      },
      {
        href: "/dashboard/todo",
        label: "Shared Todos",
        description: "Coordinate chores and follow-ups with roommates.",
        icon: "todos",
        roles: ["resident", "house_manager", "platform_admin"],
      },
      {
        href: "/dashboard/members",
        label: "Household Directory",
        description: "Manage residents, managers, and admin access.",
        icon: "members",
        roles: ["house_manager", "platform_admin"],
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        href: "/dashboard#amenities",
        label: "Amenities",
        description: "Control availability and maintenance windows.",
        icon: "amenities",
        roles: ["house_manager", "platform_admin"],
      },
      {
        href: "/dashboard#booking-calendar",
        label: "Bookings",
        description: "Monitor and override Cal.com reservations.",
        icon: "bookings",
        roles: ["house_manager", "platform_admin"],
      },
      {
        href: "/dashboard#visitor-approvals",
        label: "Overnight Visitors",
        description: "Review pending guest stay requests.",
        icon: "visitors",
        roles: ["house_manager", "platform_admin"],
      },
    ],
  },
  {
    title: "Records & Finance",
    items: [
      {
        href: "/dashboard#leases",
        label: "Leases",
        description: "Track Documenso envelopes and renewal cycles.",
        icon: "leases",
        roles: ["house_manager", "platform_admin"],
      },
      {
        href: "/dashboard#floorplans",
        label: "Floorplans",
        description: "Update annotated overlays for each unit.",
        icon: "floorplans",
        roles: ["house_manager", "platform_admin"],
      },
      {
        href: "/dashboard#payments-ledger",
        label: "Payments",
        description: "View rent ledger and reconcile Stripe payouts.",
        icon: "payments",
        roles: ["house_manager", "platform_admin"],
      },
    ],
  },
];

export type AdminSection = {
  id: string;
  title: string;
  description: string;
  roles: AppRole[];
};

export const ADMIN_SECTIONS: AdminSection[] = [
  {
    id: "amenities",
    title: "Amenity Controls",
    description: "Create rules for kitchens, parking, and entertainment spaces.",
    roles: ["house_manager", "platform_admin"],
  },
  {
    id: "booking-calendar",
    title: "Booking Calendar",
    description: "Cross-property calendar for Cal.com reservations.",
    roles: ["house_manager", "platform_admin"],
  },
  {
    id: "visitor-approvals",
    title: "Overnight Visitors",
    description: "Approve or deny guest stay requests with policy notes.",
    roles: ["house_manager", "platform_admin"],
  },
  {
    id: "leases",
    title: "Lease Management",
    description: "Documenso-powered workflow for executing and renewing leases.",
    roles: ["house_manager", "platform_admin"],
  },
  {
    id: "floorplans",
    title: "Floorplans",
    description: "Manage annotated overlays and roommate assignments.",
    roles: ["house_manager", "platform_admin"],
  },
  {
    id: "payments-ledger",
    title: "Rent Ledger",
    description: "Reconcile Stripe payouts and export accounting snapshots.",
    roles: ["house_manager", "platform_admin"],
  },
];

export const ROLE_DEFINITIONS: Array<{
  role: AppRole;
  name: string;
  description: string;
}> = [
  {
    role: "resident",
    name: ROLE_LABELS.resident,
    description: "Standard roommate access: view floorplans, manage personal todos, and submit requests.",
  },
  {
    role: "house_manager",
    name: ROLE_LABELS.house_manager,
    description: "Property-level operator who manages amenities, bookings, and resident records.",
  },
  {
    role: "platform_admin",
    name: ROLE_LABELS.platform_admin,
    description: "Portfolio administrator with cross-property finance and compliance controls.",
  },
];

export function normalizeRole(role?: string | null): AppRole {
  if (role === "house_manager" || role === "platform_admin") {
    return role;
  }

  return DEFAULT_ROLE;
}

export function getCapabilities(role?: string | null): Capability {
  return ROLE_CAPABILITIES[normalizeRole(role)];
}

export function getNavGroupsForRole(role?: string | null): NavGroup[] {
  const normalized = normalizeRole(role);

  return NAV_GROUPS.map((group) => ({
    title: group.title,
    items: group.items.filter((item) => item.roles.includes(normalized)),
  })).filter((group) => group.items.length > 0);
}

export function canAccessSection(role: string | null | undefined, sectionId: string): boolean {
  const normalized = normalizeRole(role);
  return ADMIN_SECTIONS.some(
    (section) => section.id === sectionId && section.roles.includes(normalized)
  );
}

export function getNavIcon(name: NavigationIconKey): LucideIcon {
  throw new Error(
    `getNavIcon should be mapped within UI components. Attempted to resolve ${name} in config.`
  );
}
