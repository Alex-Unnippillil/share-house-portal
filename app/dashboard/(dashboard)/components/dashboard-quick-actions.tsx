import { ArrowUpRight } from "lucide-react"

import { getRoleCue } from "@/lib/role-cues"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import SmartLink from "@/components/navigation/SmartLink"

import { getDashboardRole, getQuickActions } from "../data"

export async function DashboardQuickActions() {
  const [actions, role] = await Promise.all([
    getQuickActions(),
    getDashboardRole(),
  ])
  const roleCue = getRoleCue(role)

  return (
    <Card className={cn("h-full", roleCue.accentClassName, "role-cue-surface")}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">
            Quick actions
          </CardTitle>
          <span className="role-cue-badge">{roleCue.roleLabel}</span>
        </div>
        <p className="text-sm text-muted-foreground">{roleCue.contextCopy}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action) => (
          <div
            key={action.id}
            className="flex flex-col gap-1 rounded-lg border border-transparent p-3 transition-colors hover:border-border/70 hover:bg-muted/50"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {action.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {action.description}
                </p>
              </div>
              <SmartLink
                href={action.href}
                className="shrink-0"
                intent="navigation"
              >
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
