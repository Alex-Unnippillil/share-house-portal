export type HelpDocumentResource = {
  id: string
  title: string
  href: string
  description: string
}

export type HelpVideoResource = {
  id: string
  title: string
  href: string
  description: string
  duration: string
}

type HelpRouteEntry = {
  id: string
  label: string
  patterns: string[]
  docs: HelpDocumentResource[]
  videos: HelpVideoResource[]
}

const helpEntries: HelpRouteEntry[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    patterns: ["/dashboard"],
    docs: [
      {
        id: "dashboard-overview",
        title: "Dashboard quickstart",
        href: "https://docs.roomsily.com/dashboard/overview",
        description:
          "Walk through the roommate digest, rent tile, and notifications feed.",
      },
      {
        id: "dashboard-widgets",
        title: "Customize dashboard widgets",
        href: "https://docs.roomsily.com/dashboard/widgets",
        description:
          "Learn how to pin rent, maintenance, and visitor modules for your unit.",
      },
    ],
    videos: [
      {
        id: "dashboard-daily-tour",
        title: "Daily check-in tour",
        href: "https://www.loom.com/share/dashboard-daily-tour",
        description:
          "See how residents use the daily digest to stay aligned each morning.",
        duration: "2:19",
      },
      {
        id: "dashboard-insights",
        title: "Insights pulse overview",
        href: "https://www.loom.com/share/dashboard-insights-pulse",
        description:
          "Preview analytics without leaving the dashboard, including arrears trends.",
        duration: "1:34",
      },
    ],
  },
  {
    id: "payments",
    label: "Payments",
    patterns: ["/payments"],
    docs: [
      {
        id: "payments-reminders",
        title: "Automate rent reminders",
        href: "https://docs.roomsily.com/payments/reminders",
        description:
          "Set up autopay nudges and catch-up flows for past-due balances.",
      },
      {
        id: "payments-ledger",
        title: "Reconcile split ledger entries",
        href: "https://docs.roomsily.com/payments/ledger",
        description:
          "Understand roommate splits, fees, and Stripe sync reconciliation states.",
      },
    ],
    videos: [
      {
        id: "payments-autopay",
        title: "Autopay walkthrough",
        href: "https://www.loom.com/share/payments-autopay-tour",
        description:
          "Configure autopay and review how receipts post back to the ledger.",
        duration: "3:02",
      },
    ],
  },
  {
    id: "documents",
    label: "Documents",
    patterns: ["/documents"],
    docs: [
      {
        id: "documents-workflows",
        title: "Manage Documenso envelopes",
        href: "https://docs.roomsily.com/documents/workflows",
        description:
          "Issue new leases, track signatures, and audit access logs for compliance.",
      },
      {
        id: "documents-revisions",
        title: "Version history guide",
        href: "https://docs.roomsily.com/documents/version-history",
        description:
          "Learn how Roomsily surfaces revision chains and prevents stale downloads.",
      },
    ],
    videos: [
      {
        id: "documents-history",
        title: "Version history primer",
        href: "https://www.loom.com/share/documents-versioning-primer",
        description:
          "Follow a roommate downloading the latest lease with Documenso metadata.",
        duration: "2:07",
      },
    ],
  },
  {
    id: "maintenance",
    label: "Maintenance",
    patterns: ["/maintenance", "/bookings"],
    docs: [
      {
        id: "maintenance-triage",
        title: "Maintenance triage workflow",
        href: "https://docs.roomsily.com/maintenance/triage",
        description:
          "Log requests, assign teammates, and broadcast realtime status updates.",
      },
      {
        id: "maintenance-amenities",
        title: "Amenity scheduling guardrails",
        href: "https://docs.roomsily.com/amenities/availability",
        description:
          "Configure Cal.com availability windows for kitchens, parking, and more.",
      },
    ],
    videos: [
      {
        id: "maintenance-rapid-response",
        title: "Respond to urgent issues",
        href: "https://www.loom.com/share/maintenance-response-guide",
        description:
          "Prioritise urgent maintenance and update roommates from the same screen.",
        duration: "1:48",
      },
    ],
  },
  {
    id: "visitors",
    label: "Visitors",
    patterns: ["/visitors"],
    docs: [
      {
        id: "visitors-policy",
        title: "Overnight visitor policy",
        href: "https://docs.roomsily.com/visitors/policy",
        description:
          "Review stay limits, required approvals, and automatic roommate alerts.",
      },
      {
        id: "visitors-notifications",
        title: "Keep the household informed",
        href: "https://docs.roomsily.com/visitors/notifications",
        description:
          "Set up property manager notifications and roommate summaries per guest.",
      },
    ],
    videos: [
      {
        id: "visitors-request",
        title: "Submit a guest stay",
        href: "https://www.loom.com/share/visitors-request-demo",
        description:
          "See how to log an overnight visitor, add context, and track approvals.",
        duration: "1:21",
      },
    ],
  },
  {
    id: "workspace",
    label: "Roomsily workspace",
    patterns: ["*"],
    docs: [
      {
        id: "workspace-orientation",
        title: "Roomsily orientation",
        href: "https://docs.roomsily.com/getting-started/orientation",
        description:
          "Take a tour across rent, documents, messaging, and amenity scheduling.",
      },
    ],
    videos: [
      {
        id: "workspace-intro",
        title: "Roomsily in 90 seconds",
        href: "https://www.loom.com/share/roomsily-orientation",
        description:
          "High-level walkthrough of the tenant portal experience for new users.",
        duration: "1:30",
      },
    ],
  },
]

const fallbackEntry = helpEntries[helpEntries.length - 1]

function normalizePathname(pathname: string): string {
  if (!pathname) {
    return "/"
  }
  if (pathname === "/") {
    return "/"
  }
  return pathname.replace(/\/$/, "") || "/"
}

function matchesPattern(pathname: string, pattern: string): boolean {
  if (pattern === "*") {
    return true
  }

  const normalizedPattern = pattern === "/" ? "/" : pattern.replace(/\/$/, "")
  if (normalizedPattern === "/") {
    return pathname === "/"
  }

  return (
    pathname === normalizedPattern ||
    pathname.startsWith(`${normalizedPattern}/`)
  )
}

export type ResolvedHelpContent = {
  entryId: string
  label: string
  docs: HelpDocumentResource[]
  videos: HelpVideoResource[]
}

export function resolveHelpContent(pathname: string): ResolvedHelpContent {
  const normalizedPath = normalizePathname(pathname)
  const entry =
    helpEntries.find((candidate) =>
      candidate.patterns.some((pattern) => matchesPattern(normalizedPath, pattern))
    ) ?? fallbackEntry

  return {
    entryId: entry.id,
    label: entry.label,
    docs: entry.docs,
    videos: entry.videos,
  }
}
