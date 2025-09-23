import { Button } from "@/components/ui/button"
import SmartLink from "@/components/navigation/SmartLink"
import { getDashboardAudience, getWelcomeMessage } from "../data"

export async function DashboardWelcome() {
  const [message, audience] = await Promise.all([
    getWelcomeMessage(),
    getDashboardAudience(),
  ])
  const sectionLabel =
    audience === "manager" ? "Portfolio dashboard" : "Resident dashboard"

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          {sectionLabel}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {message.title}
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">{message.subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SmartLink href={message.primaryAction.href} intent="critical">
          <Button size="sm">{message.primaryAction.label}</Button>
        </SmartLink>
        {message.secondaryAction ? (
          <SmartLink href={message.secondaryAction.href} intent="passive">
            <Button variant="outline" size="sm">
              {message.secondaryAction.label}
            </Button>
          </SmartLink>
        ) : null}
      </div>
    </div>
  )
}
