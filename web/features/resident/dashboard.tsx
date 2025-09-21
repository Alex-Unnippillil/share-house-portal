'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useResidentDashboard } from './hooks'

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))

export const ResidentDashboard = () => {
  const { data, isLoading, isError, error } = useResidentDashboard()

  if (isLoading) {
    return (
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        Loading resident dashboard…
      </p>
    )
  }

  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {(error as Error).message || 'Unable to load dashboard information.'}
      </p>
    )
  }

  if (!data) {
    return null
  }

  return (
    <section aria-labelledby="resident-dashboard-heading" className="space-y-6">
      <div className="space-y-2">
        <h2 id="resident-dashboard-heading" className="text-2xl font-semibold tracking-tight">
          Resident dashboard
        </h2>
        <p className="text-sm text-muted-foreground">
          Stay informed with building activity, maintenance updates, and upcoming events.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map(metric => (
          <Card key={metric.id} aria-label={`${metric.label} metric`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
              <span
                className={`text-xs font-medium ${metric.trend === 'up' ? 'text-emerald-600' : 'text-destructive'}`}
                aria-label={`${metric.change}% ${metric.trend === 'up' ? 'increase' : 'decrease'} from last period`}
              >
                {metric.trend === 'up' ? '▲' : '▼'} {metric.change}%
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{metric.value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Maintenance overview</CardTitle>
            <CardDescription>Track the progress of your community requests.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-muted-foreground">Open</dt>
                <dd className="text-xl font-semibold">{data.maintenance.open}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">In progress</dt>
                <dd className="text-xl font-semibold">{data.maintenance.inProgress}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Resolved this month</dt>
                <dd className="text-xl font-semibold">{data.maintenance.resolvedThisMonth}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming events</CardTitle>
            <CardDescription>Plan ahead with the latest community gatherings.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {data.upcomingEvents.map(event => (
                <li key={event.id} className="rounded-lg border border-border bg-card p-3">
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(event.date)} · {event.location}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
