import { siteConfig } from "@/config/site"

export type RecoveryResource = {
  title: string
  href: string
  description: string
}

export const recoveryResources: RecoveryResource[] = [
  {
    title: "Resident dashboard",
    href: "/dashboard",
    description: "See rent status, bookings, and household alerts at a glance.",
  },
  {
    title: "Payments",
    href: "/payments",
    description: "Review autopay, receipts, and outstanding roommate balances.",
  },
  {
    title: "Bookings",
    href: "/bookings",
    description: "Reserve shared amenities with conflict-free Cal.com schedules.",
  },
  {
    title: "Documents",
    href: "/documents",
    description: "Access leases, renewals, and shared agreements in one vault.",
  },
  {
    title: "Messaging",
    href: "/messaging",
    description: "Catch up on roommate announcements, polls, and repairs threads.",
  },
  {
    title: "Visitors",
    href: "/visitors",
    description: "Register overnight guests and check approval status instantly.",
  },
  {
    title: "Maintenance",
    href: "/maintenance",
    description: "Track open requests and coordinate updates with the property team.",
  },
  {
    title: "Chores",
    href: "/chores",
    description: "Stay aligned on rotating chores and household rituals.",
  },
  {
    title: "Supplies",
    href: "/supplies",
    description: "Plan shared shopping lists and restock reminders for the house.",
  },
  {
    title: "Account settings",
    href: "/account",
    description: "Update your profile, notifications, and linked integrations.",
  },
  {
    title: "Contact support",
    href: siteConfig.links.contact,
    description: "Reach the Roomsily support crew or your property manager.",
  },
]

export function filterRecoveryResources(query: string): RecoveryResource[] {
  const normalized = query.trim().toLowerCase()

  if (!normalized) {
    return recoveryResources
  }

  return recoveryResources.filter((resource) =>
    [resource.title, resource.description].some((value) =>
      value.toLowerCase().includes(normalized)
    )
  )
}
