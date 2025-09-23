"use client"

import { ArrowRight } from "lucide-react"

import SmartLink from "@/components/navigation/SmartLink"
import { cn } from "@/lib/utils"

export type ResumeActivityBannerProps = {
  href: string
  label: string
  entityType: string
  entityId: string
  className?: string
}

export default function ResumeActivityBanner({
  href,
  label,
  entityType,
  entityId,
  className,
}: ResumeActivityBannerProps) {
  return (
    <SmartLink
      href={href}
      intent="navigation"
      recentActivity={{
        entityType,
        entityId,
        label,
        route: href,
      }}
      className={cn(
        "group flex items-center justify-between gap-3 rounded-md border border-border bg-background px-4 py-3 text-sm",
        "transition-colors hover:bg-muted",
        className,
      )}
    >
      <div className="space-y-0.5">
        <p className="font-medium text-foreground">Resume where you left off</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
    </SmartLink>
  )
}
