export type PerformanceMetric = "tti" | "dataFetch"

export type DeviceProfile = "mid-tier-mobile" | "desktop"

export interface PerformanceBudgetMetric {
  thresholdMs: number
  percentile: number
  description?: string
  objective?: string
}

export interface RoutePerformanceBudget {
  /**
   * Route matcher supports dynamic segments using Next.js syntax (e.g. `/documents/[id]`).
   * Wildcards using `*` are also supported for prefix matches.
   */
  route: string
  device: DeviceProfile
  metrics: Partial<Record<PerformanceMetric, PerformanceBudgetMetric>>
  owner?: string
  notes?: string
}

export type ResolvedPerformanceBudget = PerformanceBudgetMetric & {
  route: string
  device: DeviceProfile
  matcher: string
}

export const DEFAULT_DEVICE: DeviceProfile = "mid-tier-mobile"

const mobileTtiBudget: PerformanceBudgetMetric = {
  thresholdMs: 2500,
  percentile: 95,
  description: "P95 TTI on mid-tier mobile stays below 2.5 s",
  objective: "Ensure interactive tenant dashboard experience",
}

const desktopTtiBudget: PerformanceBudgetMetric = {
  thresholdMs: 1800,
  percentile: 95,
  description: "Desktop TTI should feel instant for admins",
}

export const performanceBudgets: RoutePerformanceBudget[] = [
  {
    route: "/",
    device: "mid-tier-mobile",
    metrics: {
      tti: mobileTtiBudget,
      dataFetch: {
        thresholdMs: 800,
        percentile: 95,
        description: "Landing hero data and feature flags hydrate quickly",
      },
    },
    notes: "Homepage introduces the product — keep it snappy to reduce bounce.",
  },
  {
    route: "/dashboard",
    device: "mid-tier-mobile",
    metrics: {
      tti: mobileTtiBudget,
      dataFetch: {
        thresholdMs: 1200,
        percentile: 95,
        description: "Dashboard aggregates rent, bookings, and roommate feed",
      },
    },
    owner: "foundations",
  },
  {
    route: "/payments",
    device: "mid-tier-mobile",
    metrics: {
      tti: mobileTtiBudget,
      dataFetch: {
        thresholdMs: 1400,
        percentile: 95,
        description: "Stripe ledger summaries and invoices",
      },
    },
  },
  {
    route: "/documents",
    device: "mid-tier-mobile",
    metrics: {
      tti: mobileTtiBudget,
      dataFetch: {
        thresholdMs: 1500,
        percentile: 95,
        description: "Documenso envelopes and Supabase metadata",
      },
    },
  },
  {
    route: "/messaging",
    device: "mid-tier-mobile",
    metrics: {
      tti: mobileTtiBudget,
      dataFetch: {
        thresholdMs: 1100,
        percentile: 95,
        description: "Realtime room data should hydrate under 1.1s",
      },
    },
  },
  {
    route: "/visitors",
    device: "mid-tier-mobile",
    metrics: {
      tti: mobileTtiBudget,
      dataFetch: {
        thresholdMs: 1000,
        percentile: 95,
        description: "Visitor log pull from Supabase",
      },
    },
  },
  {
    route: "/maintenance",
    device: "mid-tier-mobile",
    metrics: {
      tti: mobileTtiBudget,
      dataFetch: {
        thresholdMs: 1300,
        percentile: 95,
        description: "Maintenance queue and vendor ETA aggregation",
      },
    },
  },
  {
    route: "/schedule",
    device: "mid-tier-mobile",
    metrics: {
      tti: mobileTtiBudget,
      dataFetch: {
        thresholdMs: 1250,
        percentile: 95,
        description: "Cal.com slot availability hydration",
      },
    },
  },
  {
    route: "/dashboard/todo",
    device: "mid-tier-mobile",
    metrics: {
      dataFetch: {
        thresholdMs: 900,
        percentile: 95,
        description: "Dashboard task widget should feel instant",
      },
    },
  },
  {
    route: "/dashboard/members",
    device: "mid-tier-mobile",
    metrics: {
      dataFetch: {
        thresholdMs: 900,
        percentile: 95,
        description: "Member list hydration",
      },
    },
  },
  {
    route: "*",
    device: "mid-tier-mobile",
    metrics: {
      tti: mobileTtiBudget,
      dataFetch: {
        thresholdMs: 1500,
        percentile: 95,
        description: "Fallback mobile budget for unclassified routes",
      },
    },
  },
  {
    route: "*",
    device: "desktop",
    metrics: {
      tti: desktopTtiBudget,
      dataFetch: {
        thresholdMs: 1000,
        percentile: 95,
        description: "Desktop fallback budget",
      },
    },
  },
]

const routeMatcherCache = new Map<string, RegExp>()

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const buildRouteMatcher = (pattern: string) => {
  if (routeMatcherCache.has(pattern)) {
    return routeMatcherCache.get(pattern) as RegExp
  }

  const escaped = escapeRegex(pattern)
    .replace(/\\\[[^/]+?\\\]/g, "[^/]+")
    .replace(/\\\*/g, ".*")

  const matcher = new RegExp(`^${escaped}$`)
  routeMatcherCache.set(pattern, matcher)
  return matcher
}

export const normalizeRoute = (route: string): string => {
  if (!route) return "/"
  if (route === "/") return "/"

  const sanitized = route.trim()
  const withoutHash = sanitized.split("#")[0] ?? sanitized
  const withoutQuery = withoutHash.split("?")[0] ?? withoutHash
  const normalized = withoutQuery.length > 0 ? withoutQuery : "/"
  return normalized.endsWith("/") && normalized !== "/"
    ? normalized.slice(0, -1)
    : normalized
}

export const matchesBudgetRoute = (matcher: string, route: string): boolean => {
  const normalizedRoute = normalizeRoute(route)
  const normalizedMatcher = normalizeRoute(matcher)

  if (normalizedMatcher === "*") {
    return true
  }

  const regex = buildRouteMatcher(normalizedMatcher)
  return regex.test(normalizedRoute)
}

export const findPerformanceBudget = (
  route: string,
  device: DeviceProfile = DEFAULT_DEVICE
): RoutePerformanceBudget | undefined => {
  const normalizedRoute = normalizeRoute(route)

  for (const budget of performanceBudgets) {
    if (budget.device !== device) continue
    if (matchesBudgetRoute(budget.route, normalizedRoute)) {
      return budget
    }
  }

  return undefined
}

export const getPerformanceMetricBudget = (
  route: string,
  metric: PerformanceMetric,
  device: DeviceProfile = DEFAULT_DEVICE
): ResolvedPerformanceBudget | undefined => {
  const budget = findPerformanceBudget(route, device)
  const metricBudget = budget?.metrics[metric]

  if (metricBudget) {
    return {
      ...metricBudget,
      route,
      device,
      matcher: budget.route,
    }
  }

  if (device !== DEFAULT_DEVICE) {
    return getPerformanceMetricBudget(route, metric, DEFAULT_DEVICE)
  }

  return undefined
}
