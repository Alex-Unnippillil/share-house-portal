"use client"

import { CrumpledPaperIcon, PersonIcon } from "@radix-ui/react-icons"
import { usePathname } from "next/navigation"

import SmartLink from "@/components/navigation/SmartLink"
import { getRoleNavigation, type PortalRole } from "@/config/navigation"
import { cn } from "@/lib/utils"

type NavLinksProps = {
  onNavigate?: () => void
  role?: PortalRole | null
}

const iconByHref = {
  "/dashboard/members": PersonIcon,
} as const

export default function NavLinks({ onNavigate, role = "tenant" }: NavLinksProps) {
  const pathname = usePathname()
  const navigation = getRoleNavigation(role)

  return (
    <div className="space-y-5">
      {navigation.sections.map((section) => (
        <section key={section.id} className="space-y-2" aria-label={section.title}>
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground/90">{section.title}</p>
          <div className="space-y-1">
            {section.items.filter((link) => Boolean(link.href)).map((link) => {
              const href = link.href as string
              const Icon = iconByHref[href as keyof typeof iconByHref] ?? CrumpledPaperIcon
              const isActive = pathname === href || pathname.startsWith(`${href}/`)

              return (
                <SmartLink
                  key={href}
                  onClick={onNavigate}
                  href={href}
                  intent="navigation"
                  className={cn(
                    "group relative flex items-center justify-between gap-3 rounded-md border-l-2 border-l-transparent p-2 pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none",
                    isActive
                      ? "border-l-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/95"
                      : "text-foreground hover:border-l-primary/60 hover:bg-muted/90 focus-visible:border-l-primary/70 focus-visible:bg-muted"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{link.title}</span>
                      {link.subtitle ? (
                        <span
                          className={cn(
                            "block truncate text-xs",
                            isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                          )}
                        >
                          {link.subtitle}
                        </span>
                      ) : null}
                    </span>
                  </span>

                  {link.badge ? (
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        isActive
                          ? "border-primary-foreground/60 bg-primary-foreground/20 text-primary-foreground"
                          : "border-primary/40 bg-primary/10 text-primary"
                      )}
                    >
                      {link.badge}
                    </span>
                  ) : null}
                </SmartLink>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
