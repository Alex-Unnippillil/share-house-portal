import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getFeedbackAnalytics } from "../feedback-data"

function formatTrend(delta: number | null) {
  if (delta === null) {
    return { label: 'No prior quarter', variant: 'secondary' as const }
  }

  if (delta > 0) {
    return { label: `+${delta} vs last quarter`, variant: 'default' as const }
  }

  if (delta < 0) {
    return { label: `${delta} vs last quarter`, variant: 'destructive' as const }
  }

  return { label: 'Flat vs last quarter', variant: 'outline' as const }
}

export async function FeedbackAnalyticsPanel() {
  const analytics = await getFeedbackAnalytics()
  const trend = formatTrend(analytics.nps.trendDelta)

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            Resident NPS
            <Badge variant="outline" className="text-xs font-medium">
              {analytics.nps.responseCount} responses
            </Badge>
          </CardTitle>
          <CardDescription>
            Quarterly sentiment from active households about the overall living
            experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-semibold text-foreground">
              {analytics.nps.currentScore ?? '—'}
            </span>
            <Badge variant={trend.variant}>{trend.label}</Badge>
            {analytics.nps.previousScore !== null ? (
              <span className="text-sm text-muted-foreground">
                Prev: {analytics.nps.previousScore}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm">
            {(
              [
                { label: 'Promoters', value: analytics.nps.distribution.promoters },
                { label: 'Passives', value: analytics.nps.distribution.passives },
                { label: 'Detractors', value: analytics.nps.distribution.detractors },
              ] as const
            ).map((entry) => (
              <div
                key={entry.label}
                className="rounded-md border border-border/60 p-3 text-center"
              >
                <p className="text-xs uppercase text-muted-foreground">
                  {entry.label}
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {entry.value}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Recent comments
            </p>
            {analytics.nps.recentComments.length > 0 ? (
              <ul className="space-y-2">
                {analytics.nps.recentComments.map((comment) => (
                  <li
                    key={`${comment.createdAt}-${comment.feedback}`}
                    className="rounded-md border border-border/50 bg-muted/40 p-3 text-sm"
                  >
                    <p className="text-foreground">{comment.feedback}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No written feedback captured for the current window.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            CSAT by workflow
            <Badge variant="outline" className="text-xs font-medium">
              Avg {analytics.csat.averageRating ?? '—'} / 5
            </Badge>
          </CardTitle>
          <CardDescription>
            Post-completion satisfaction across digital signing and maintenance
            resolution touch points.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {analytics.csat.contextBreakdown.length > 0 ? (
              analytics.csat.contextBreakdown.map((entry) => (
                <div
                  key={entry.context}
                  className="flex items-center justify-between rounded-md border border-border/60 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {entry.context === 'document_signed'
                        ? 'Document signed'
                        : 'Maintenance resolved'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.count} responses
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-foreground">
                    {entry.average?.toFixed(2) ?? '—'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No CSAT responses collected yet.
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Encourage property teams to follow up on any CSAT below 3 to reinforce
            service recovery.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/70 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Feedback velocity</CardTitle>
          <CardDescription>
            Rolling six-month snapshot comparing NPS and CSAT averages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Period</th>
                  <th className="px-4 py-2">NPS</th>
                  <th className="px-4 py-2">CSAT</th>
                </tr>
              </thead>
              <tbody>
                {analytics.timeline.map((entry, index) => (
                  <tr
                    key={`${entry.period}-${index}`}
                    className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                  >
                    <td className="px-4 py-2 font-medium text-foreground">
                      {entry.period}
                    </td>
                    <td className="px-4 py-2 text-foreground">
                      {entry.npsScore ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-foreground">
                      {entry.csatAverage?.toFixed(2) ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
