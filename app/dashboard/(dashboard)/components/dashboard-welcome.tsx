import { getTranslations } from "next-intl/server"

import { Button } from "@/components/ui/button"
import SmartLink from "@/components/navigation/SmartLink"
import { getWelcomeMessage } from "../data"

export async function DashboardWelcome() {
  const [message, t] = await Promise.all([
    getWelcomeMessage(),
    getTranslations("Dashboard.Welcome"),
  ])

  const badgeLabel = t("badge")
  const title = t("title", { name: message.residentName })
  const subtitle = t("subtitle", { unit: message.unit })
  const primaryLabel = t(message.primaryAction.labelKey)

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          {badgeLabel}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">{subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SmartLink href={message.primaryAction.href} intent="critical">
          <Button size="sm">{primaryLabel}</Button>
        </SmartLink>
        {message.secondaryAction ? (
          <SmartLink href={message.secondaryAction.href} intent="passive">
            <Button variant="outline" size="sm">
              {t(message.secondaryAction.labelKey)}
            </Button>
          </SmartLink>
        ) : null}
      </div>
    </div>
  )
}
