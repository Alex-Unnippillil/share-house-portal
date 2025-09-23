export const PERFORMANCE_METRICS = ['lcp', 'tti'] as const

export type PerformanceMetric = (typeof PERFORMANCE_METRICS)[number]

export type PerformanceBudgetValues = Record<PerformanceMetric, number>

export interface RouteBudgetConfig {
  description?: string
  metrics?: Partial<PerformanceBudgetValues>
}

export interface ResolvedPerformanceBudget {
  route: string
  description?: string
  metrics: PerformanceBudgetValues
}

export interface PerformanceMetricCheck {
  actual: number | null
  budget: number
  passed: boolean
}

export interface PerformanceCheckResult {
  route: string
  description?: string
  metrics: Record<PerformanceMetric, PerformanceMetricCheck>
  passed: boolean
}

export interface PerformanceReport {
  generatedAt: string
  results: PerformanceCheckResult[]
}

const DEFAULT_METRIC_BUDGETS: PerformanceBudgetValues = {
  lcp: 2500,
  tti: 4000,
}

export const PERFORMANCE_BUDGETS: Record<string, RouteBudgetConfig> = {
  '/': {
    description: 'Tenant landing experience',
    metrics: {
      lcp: 2300,
      tti: 3600,
    },
  },
  '/dashboard': {
    description: 'Authenticated dashboard shell',
    metrics: {
      lcp: 2500,
      tti: 3800,
    },
  },
  '/documents': {
    description: 'Document center overview',
    metrics: {
      lcp: 2600,
      tti: 3900,
    },
  },
  '/messaging': {
    description: 'Realtime message board',
    metrics: {
      lcp: 2700,
      tti: 4000,
    },
  },
  '/payments': {
    description: 'Rent payments overview',
    metrics: {
      lcp: 2600,
      tti: 3800,
    },
  },
  '/perf/metrics': {
    description: 'Internal performance dashboard',
    metrics: {
      lcp: 3200,
      tti: 4200,
    },
  },
}

export function listPerformanceBudgets(): ResolvedPerformanceBudget[] {
  return Object.entries(PERFORMANCE_BUDGETS)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([route, config]) => ({
      route,
      description: config.description,
      metrics: {
        ...DEFAULT_METRIC_BUDGETS,
        ...(config.metrics ?? {}),
      },
    }))
}

export function resolveBudgetForPath(path: string | URL): ResolvedPerformanceBudget {
  const pathname = typeof path === 'string' ? path : path.pathname
  const normalized = normalizeRoute(pathname)
  const config = PERFORMANCE_BUDGETS[normalized]

  if (config) {
    return {
      route: normalized,
      description: config.description,
      metrics: {
        ...DEFAULT_METRIC_BUDGETS,
        ...(config.metrics ?? {}),
      },
    }
  }

  return {
    route: normalized,
    description: 'Fallback budget applied',
    metrics: { ...DEFAULT_METRIC_BUDGETS },
  }
}

export function formatServerTimingHeader(budget: ResolvedPerformanceBudget): string {
  return PERFORMANCE_METRICS.map((metric) => {
    const upper = metric.toUpperCase()
    const description = `${upper} budget for ${budget.route}`
    const duration = Math.round(budget.metrics[metric])
    return `${metric};desc="${description}";dur=${duration}`
  }).join(', ')
}

function normalizeRoute(pathname: string): string {
  const value = pathname.split('?')[0].split('#')[0]
  if (!value || value === '/') {
    return '/'
  }
  return value.endsWith('/') ? value.slice(0, -1) : value
}
