import SmartLink from "@/components/navigation/SmartLink"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardAudience, getQuickActions } from "../data"
import { ArrowUpRight } from "lucide-react"

export async function DashboardQuickActions() {
  const [actions, audience] = await Promise.all([
    getQuickActions(),
    getDashboardAudience(),
  ])

  const title =
    audience === "manager" ? "Portfolio quick actions" : "Quick actions"
  const description =
    audience === "manager"
      ? "Stay ahead on turnovers, leasing, and maintenance follow-ups across your properties."
      : "Jump straight into the tasks your household completes most."

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action) => (
          <div
            key={action.id}
            className="flex flex-col gap-1 rounded-lg border border-transparent p-3 transition-colors hover:border-border/70 hover:bg-muted/50"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
              <SmartLink href={action.href} className="shrink-0" intent="navigation">
                <Button variant="ghost" size="icon" className="size-8">
                  <ArrowUpRight className="size-4" />
                  <span className="sr-only">{`Go to ${action.label}`}</span>
                </Button>
              </SmartLink>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
