import { Badge } from "@/components/ui/badge"
import { Icons } from "@/components/icons"
import { cn } from "@/lib/utils"

interface NavItemRowProps {
  title: string
  subtitle?: string
  badge?: string
  icon?: keyof typeof Icons
  className?: string
}

export function NavItemRow({ title, subtitle, badge, icon, className }: NavItemRowProps) {
  const Icon = icon ? Icons[icon] : null

  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium leading-tight">{title}</p>
          {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
      {badge ? (
        <Badge variant="secondary" className="shrink-0 text-[10px] uppercase tracking-wide">
          {badge}
        </Badge>
      ) : null}
    </div>
  )
}
