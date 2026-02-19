import type { ComponentType } from "react"
import Link from "next/link"
import type { LucideProps } from "lucide-react"

import SmartLink from "@/components/navigation/SmartLink"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type BadgeRowProps = {
  badges: string[]
  label: string
}

export function BadgeRow({ badges, label }: BadgeRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground lg:justify-start">
      <span className="font-medium text-foreground">{label}</span>
      {badges.map((badge) => (
        <span
          key={badge}
          className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary"
        >
          {badge}
        </span>
      ))}
    </div>
  )
}

type MetricCardProps = {
  value: string
  label: string
  icon: ComponentType<LucideProps>
}

export function MetricCard({ value, label, icon: Icon }: MetricCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-background/80 px-6 py-5 text-left shadow-sm backdrop-blur">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-3xl font-semibold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

type CtaButton = {
  href: string
  label: string
  variant?: "default" | "outline" | "ghost"
  size?: "sm" | "lg"
  className?: string
  intent?: "passive" | "critical"
  useSmartLink?: boolean
}

type CtaButtonGroupProps = {
  buttons: CtaButton[]
  className?: string
}

export function CtaButtonGroup({ buttons, className }: CtaButtonGroupProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row", className)}>
      {buttons.map((button) => {
        const shared = cn(buttonVariants({ variant: button.variant, size: button.size }), button.className)

        if (button.useSmartLink) {
          return (
            <SmartLink key={button.label} href={button.href} className={shared} intent={button.intent}>
              <span>{button.label}</span>
            </SmartLink>
          )
        }

        return (
          <Link key={button.label} href={button.href} className={shared}>
            <span>{button.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
