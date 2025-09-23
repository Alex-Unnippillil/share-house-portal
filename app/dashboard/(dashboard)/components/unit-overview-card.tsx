import SmartLink from "@/components/navigation/SmartLink"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getUnitOverview } from "../data"

export async function UnitOverviewCard() {
  const overview = await getUnitOverview()

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Unit overview
          </p>
          <CardTitle className="text-lg font-semibold text-foreground">
            {overview.unitLabel}
          </CardTitle>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{overview.propertyLabel}</p>
          {overview.addressLines.length ? (
            <div className="space-y-0.5">
              {overview.addressLines.map((line) => (
                <p key={line} className="text-xs text-muted-foreground">
                  {line}
                </p>
              ))}
            </div>
          ) : null}
          {overview.highlight ? (
            <p className="text-xs text-muted-foreground">{overview.highlight}</p>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Household status
          </p>
          <p className="text-sm text-foreground">{overview.occupancySummary}</p>
        </div>

        {overview.status === "assigned" ? (
          overview.members.length ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Roommates</p>
              <ul className="space-y-2">
                {overview.members.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-transparent bg-muted/30 p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{member.name}</p>
                        {member.isYou ? <Badge variant="outline">You</Badge> : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {member.roleLabel}
                        {member.rentShareLabel ? ` • ${member.rentShareLabel}` : null}
                      </p>
                    </div>
                    {member.email ? (
                      <span className="text-xs text-muted-foreground">{member.email}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No roommates have joined yet. Invite them to share rent, chores, and amenity bookings.
            </p>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            We’ll list roommates once onboarding is complete and your unit assignment is confirmed.
          </p>
        )}

        <div className="rounded-lg border border-dashed border-border/60 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Property manager</p>
          {overview.propertyManager ? (
            <div className="mt-1 space-y-1">
              <p className="text-sm font-medium text-foreground">
                {overview.propertyManager.name}
              </p>
              {overview.propertyManager.email ? (
                <p className="text-xs text-muted-foreground">
                  {overview.propertyManager.email}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No property manager assigned yet. Reach out to your leasing team if you need assistance.
            </p>
          )}
        </div>

        <SmartLink href={overview.cta.href} className="inline-flex" intent="standard">
          <Button
            variant={overview.status === "unassigned" ? "default" : "outline"}
            size="sm"
            className="w-full sm:w-auto"
          >
            {overview.cta.label}
          </Button>
        </SmartLink>
      </CardContent>
    </Card>
  )
}
