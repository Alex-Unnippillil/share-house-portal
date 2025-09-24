"use client"

import * as React from "react"

import SmartLink from "@/components/navigation/SmartLink"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import { Icons } from "@/components/icons"
import { siteConfig, type SiteConfig } from "@/config/site"

type StatusSummary = {
  status?: {
    description?: string
    indicator?: string
  }
  incidents?: Array<{
    id: string
    name?: string
    status?: string
    impact?: string
  }>
  scheduled_maintenances?: Array<{
    id: string
    name?: string
    status?: string
  }>
}

const INDICATOR_VARIANTS: Record<string, BadgeProps["variant"]> = {
  none: "complete",
  maintenance: "outline",
  minor: "secondary",
  major: "destructive",
  critical: "destructive",
}

function getIndicatorVariant(indicator?: string): BadgeProps["variant"] {
  if (!indicator) {
    return "secondary"
  }

  return INDICATOR_VARIANTS[indicator] ?? "secondary"
}

function useStatusSummary(summaryUrl?: string) {
  const [summary, setSummary] = React.useState<StatusSummary | null>(null)

  React.useEffect(() => {
    if (!summaryUrl) {
      setSummary(null)
      return
    }

    let cancelled = false
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch(summaryUrl, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`Failed to fetch status summary (${response.status})`)
        }

        const json = (await response.json()) as StatusSummary
        if (!cancelled) {
          setSummary(json)
        }
      } catch (error) {
        if (
          cancelled ||
          (error instanceof Error && error.name === "AbortError")
        ) {
          return
        }

        setSummary(null)
      }
    }

    void load()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [summaryUrl])

  return summary
}

type SiteFooterProps = {
  config?: SiteConfig
}

export function SiteFooter({ config = siteConfig }: SiteFooterProps) {
  const statusSummary = useStatusSummary(config.status?.summaryUrl)

  const activeIncidents = React.useMemo(() => {
    if (!statusSummary?.incidents?.length) {
      return []
    }

    return statusSummary.incidents.filter((incident) => {
      const status = incident.status?.toLowerCase()
      return status && !["resolved", "completed", "postmortem"].includes(status)
    })
  }, [statusSummary?.incidents])

  const scheduledMaintenances = React.useMemo(() => {
    if (!statusSummary?.scheduled_maintenances?.length) {
      return 0
    }

    return statusSummary.scheduled_maintenances.filter((maintenance) => {
      const status = maintenance.status?.toLowerCase()
      return status && status !== "completed"
    }).length
  }, [statusSummary?.scheduled_maintenances])

  const roadmapUrl = config.links.roadmap
  const statusPageUrl = config.links.status

  const statusDescription = statusSummary?.status?.description
  const indicatorVariant = getIndicatorVariant(
    statusSummary?.status?.indicator?.toLowerCase()
  )

  return (
    <footer className="z-40 border-t">
      <div className="container flex flex-col gap-8 py-8 md:flex-row md:py-12">
        <div className="flex-1 space-y-4">
          <SmartLink className="ml-0 inline-flex" href="/" intent="navigation">
            <span className="flex items-center gap-2">
              <Icons.logo className="size-6" />
              <div className="flex flex-col leading-tight">
                <span className="inline-block font-semibold">{config.name}</span>
                <span className="text-xs font-medium text-muted-foreground">
                  www.roomsily
                </span>
              </div>
            </span>
          </SmartLink>
          <p className="text-sm text-muted-foreground">
            Manage rent, roommates, and shared amenities from a single, secure Roomsily HQ.
          </p>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-12 sm:grid-cols-3">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Solutions</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <SmartLink
                  href="/payments"
                  className="text-muted-foreground transition-colors hover:text-primary"
                  intent="navigation"
                >
                  Rent payments
                </SmartLink>
              </li>
              <li>
                <SmartLink
                  href="/documents"
                  className="text-muted-foreground transition-colors hover:text-primary"
                  intent="navigation"
                >
                  Document vault
                </SmartLink>
              </li>
              <li>
                <SmartLink
                  href="/messaging"
                  className="text-muted-foreground transition-colors hover:text-primary"
                  intent="navigation"
                >
                  Roommate messaging
                </SmartLink>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Company</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <SmartLink
                  href="/about"
                  className="text-muted-foreground transition-colors hover:text-primary"
                  intent="navigation"
                >
                  About Us
                </SmartLink>
              </li>
              <li>
                <SmartLink
                  href="/contact"
                  className="text-muted-foreground transition-colors hover:text-primary"
                  intent="navigation"
                >
                  Contact
                </SmartLink>
              </li>
              <li>
                <SmartLink
                  href="/privacy"
                  className="text-muted-foreground transition-colors hover:text-primary"
                  intent="navigation"
                >
                  Privacy Policy
                </SmartLink>
              </li>
              <li>
                <SmartLink
                  href="/terms"
                  className="text-muted-foreground transition-colors hover:text-primary"
                  intent="navigation"
                >
                  Terms of Service
                </SmartLink>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Resources</h3>
            <ul className="space-y-3 text-sm">
              {roadmapUrl ? (
                <li>
                  <SmartLink
                    href={roadmapUrl}
                    className="text-muted-foreground transition-colors hover:text-primary"
                    intent="navigation"
                  >
                    Public roadmap
                  </SmartLink>
                </li>
              ) : null}
              {statusPageUrl ? (
                <li>
                  <SmartLink
                    href={statusPageUrl}
                    className="text-muted-foreground transition-colors hover:text-primary"
                    intent="navigation"
                  >
                    Status
                  </SmartLink>
                </li>
              ) : null}
            </ul>
            {statusPageUrl && statusSummary ? (
              <div className="flex flex-wrap gap-2">
                {statusDescription ? (
                  <Badge variant={indicatorVariant}>{statusDescription}</Badge>
                ) : null}
                <Badge
                  variant={
                    activeIncidents.length > 0 || scheduledMaintenances > 0
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {activeIncidents.length > 0
                    ? `${activeIncidents.length} active incident${activeIncidents.length > 1 ? "s" : ""}`
                    : scheduledMaintenances > 0
                      ? `${scheduledMaintenances} scheduled maintenance${scheduledMaintenances > 1 ? "s" : ""}`
                      : "No active incidents"}
                </Badge>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="container border-t py-6">
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {config.name}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}