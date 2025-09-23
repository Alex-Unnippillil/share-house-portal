import SmartLink from "@/components/navigation/SmartLink"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getPortfolioOverview } from "../data"

export async function ManagerPortfolioCard() {
  const overview = await getPortfolioOverview()

  const metrics = [
    {
      id: "occupancy",
      label: "Occupancy rate",
      value: `${overview.occupancyRate}%`,
      helper:
        overview.unitCount > 0
          ? `${overview.occupiedUnits} of ${overview.unitCount} units filled`
          : "Assign units to start tracking",
    },
    {
      id: "residents",
      label: "Active residents",
      value: `${overview.totalResidents}`,
      helper:
        overview.propertyCount > 0
          ? `Across ${overview.propertyCount} ${
              overview.propertyCount === 1 ? "property" : "properties"
            }`
          : "Awaiting portfolio assignments",
    },
    {
      id: "vacancy",
      label: "Open units",
      value: `${overview.vacancyCount}`,
      helper: overview.vacancyCount ? "Prioritize leasing follow-ups" : "Fully occupied",
    },
    {
      id: "properties",
      label: "Managed properties",
      value: `${overview.propertyCount}`,
      helper: overview.propertyCount ? "Portfolio coverage" : "Assign a property to begin",
    },
  ]

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Portfolio overview
          </p>
          <CardTitle className="text-lg font-semibold text-foreground">
            Keep occupancy strong
          </CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          {overview.highlight ?? "Assign yourself to properties to populate metrics."}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 md:grid-cols-2">
          {metrics.map((metric) => (
            <div
              key={metric.id}
              className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-3"
            >
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                {metric.label}
              </dt>
              <dd className="text-lg font-semibold text-foreground">{metric.value}</dd>
              <p className="text-xs text-muted-foreground">{metric.helper}</p>
            </div>
          ))}
        </dl>

        {overview.featuredProperty ? (
          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {overview.featuredProperty.name}
                </p>
                {overview.featuredProperty.location ? (
                  <p className="text-xs text-muted-foreground">
                    {overview.featuredProperty.location}
                  </p>
                ) : null}
              </div>
              <Badge variant="outline" className="text-xs uppercase">
                {overview.featuredProperty.occupancyRate}% occupied
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {overview.featuredProperty.occupancySummary}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Assign yourself to a property to see resident and occupancy highlights here.
          </p>
        )}

        <SmartLink href={overview.cta.href} className="inline-flex" intent="standard">
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            {overview.cta.label}
          </Button>
        </SmartLink>
      </CardContent>
    </Card>
  )
}
