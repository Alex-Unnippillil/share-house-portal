import { cookies } from 'next/headers'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ANALYTICS_EVENT_COLORS,
  ANALYTICS_EVENT_LABELS,
  USAGE_TREND_EVENTS,
} from '@/lib/analytics/constants'
import {
  aggregateRollupsByScope,
  createAnalyticsPipeline,
  rollupsToTimeseries,
  summarizeRollups,
  type SupabaseAnalyticsClient,
} from '@/lib/analytics'
import {
  ANALYTICS_EVENT_TYPES,
  GLOBAL_SCOPE,
  type AnalyticsEventType,
} from '@/lib/analytics/types'
import { createClient } from '@/utils/supa-server-actions'

import UsageTimeseriesChart from './components/usage-timeseries-chart'

const numberFormatter = new Intl.NumberFormat('en-US')
const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

const DAY_IN_MS = 86_400_000
const WINDOW_DAYS = 30

export default async function UsageDashboardPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore) as SupabaseAnalyticsClient
  const analytics = createAnalyticsPipeline({ supabase })

  const today = startOfUtcDay(new Date())
  const startDate = new Date(today.getTime() - (WINDOW_DAYS - 1) * DAY_IN_MS)

  const rollups = await analytics.fetchRollups({
    from: startDate,
    to: today,
    eventTypes: ANALYTICS_EVENT_TYPES,
  })

  const summary = summarizeRollups(rollups)
  const timeseries = rollupsToTimeseries(rollups, USAGE_TREND_EVENTS, {
    from: startDate,
    to: today,
    scope: GLOBAL_SCOPE,
  })
  const scopeBreakdown = aggregateRollupsByScope(rollups, { excludeScopes: [GLOBAL_SCOPE] }).slice(0, 4)

  const totalEvents = Object.values(summary).reduce((total, entry) => total + entry.total, 0)
  const rangeLabel = `${dateFormatter.format(startDate)} – ${dateFormatter.format(today)}`

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Usage analytics</h1>
          <p className="text-sm text-muted-foreground">
            Daily instrumentation captured from Supabase to highlight resident engagement.
          </p>
        </div>
        <Badge variant="outline">Last {WINDOW_DAYS} days · {rangeLabel}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ANALYTICS_EVENT_TYPES.map((eventType) => {
          const eventSummary = summary[eventType]
          const latest = eventSummary.lastEventAt ? formatDate(eventSummary.lastEventAt) : '—'

          return (
            <Card key={eventType} className="border-border/60">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base font-semibold">
                  {ANALYTICS_EVENT_LABELS[eventType]}
                </CardTitle>
                <CardDescription>Aggregated across all households</CardDescription>
              </CardHeader>
              <CardContent className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-3xl font-semibold">
                    {numberFormatter.format(eventSummary.total)}
                  </div>
                  <p className="text-xs text-muted-foreground">Total recorded events</p>
                </div>
                <div className="space-y-1 text-right text-xs text-muted-foreground">
                  <p className="flex items-center justify-end gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: ANALYTICS_EVENT_COLORS[eventType] }}
                    />
                    Peak daily participants {numberFormatter.format(eventSummary.peakUniqueActors)}
                  </p>
                  <p>Most recent: {latest}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Key resident actions</CardTitle>
          <CardDescription>
            Multi-metric view for payments, bookings, and maintenance over the selected window.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {timeseries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tracked activity has been ingested for this period yet.
            </p>
          ) : (
            <UsageTimeseriesChart data={timeseries} series={USAGE_TREND_EVENTS} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Total events captured</CardTitle>
            <CardDescription>Sum of all tracked interactions across the dashboard window.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-4xl font-semibold">{numberFormatter.format(totalEvents)}</div>
              <p className="text-xs text-muted-foreground">Across {WINDOW_DAYS} rolling days</p>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {USAGE_TREND_EVENTS.map((eventType) => (
                <li key={`summary-${eventType}`} className="flex items-center gap-2">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: ANALYTICS_EVENT_COLORS[eventType] }}
                  />
                  <span>
                    {ANALYTICS_EVENT_LABELS[eventType]}:{' '}
                    <span className="font-medium text-foreground">
                      {numberFormatter.format(summary[eventType].total)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Most engaged units</CardTitle>
            <CardDescription>Top households ranked by captured activity.</CardDescription>
          </CardHeader>
          <CardContent>
            {scopeBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                We&apos;ll populate this view once unit-scoped events have been recorded.
              </p>
            ) : (
              <div className="space-y-3">
                {scopeBreakdown.map((entry) => {
                  const unitId = entry.scope.startsWith('unit:')
                    ? entry.scope.slice(5)
                    : entry.scope
                  const topEvent = (
                    Object.entries(entry.breakdown) as [AnalyticsEventType, number][]
                  ).reduce(
                    (current, candidate) =>
                      candidate[1] > current[1] ? candidate : current,
                    [ANALYTICS_EVENT_TYPES[0], entry.breakdown[ANALYTICS_EVENT_TYPES[0]] ?? 0]
                  )

                  return (
                    <div
                      key={entry.scope}
                      className="flex items-center justify-between rounded-md border border-border/50 p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground">Unit {unitId}</p>
                        <p className="text-xs text-muted-foreground">
                          Top signal: {ANALYTICS_EVENT_LABELS[topEvent[0]]} ·{' '}
                          {numberFormatter.format(topEvent[1])}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-semibold text-foreground">
                          {numberFormatter.format(entry.total)}
                        </p>
                        <p className="text-xs text-muted-foreground">events</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return '—'
  }

  return dateFormatter.format(new Date(value))
}
