"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useSelectedLayoutSegments } from "next/navigation"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  href: string
  label: string
  isCurrent: boolean
}

const SEGMENT_LABEL_OVERRIDES: Record<string, string> = {
  account: "Account",
  bookings: "Bookings",
  contact: "Contact",
  dashboard: "Dashboard",
  documents: "Documents",
  history: "History",
  leases: "Leases",
  maintenance: "Maintenance",
  messaging: "Messaging",
  onboarding: "Onboarding",
  payments: "Payments",
  schedule: "Schedule",
  supplies: "Supplies",
  visitors: "Visitors",
}

const formatSegmentLabel = (segment: string) => {
  const normalized = segment.toLowerCase()
  const override = SEGMENT_LABEL_OVERRIDES[normalized]
  if (override) {
    return override
  }

  return segment
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export const createBreadcrumbItems = (segments: string[]): BreadcrumbItem[] => {
  const sanitizedSegments = segments
    .map((segment) => decodeURIComponent(segment))
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)

  const crumbs = sanitizedSegments.map<BreadcrumbItem>((segment, index) => ({
    href: `/${sanitizedSegments.slice(0, index + 1).join("/")}`,
    label: formatSegmentLabel(segment),
    isCurrent: index === sanitizedSegments.length - 1,
  }))

  return [
    {
      href: "/",
      label: "Home",
      isCurrent: sanitizedSegments.length === 0,
    },
    ...crumbs,
  ]
}

export interface BreadcrumbsProps {
  className?: string
}

export function Breadcrumbs({ className }: BreadcrumbsProps) {
  const pathname = usePathname()
  const selectedSegments = useSelectedLayoutSegments()

  const segments = React.useMemo(() => {
    const fallback = pathname?.split("/").filter(Boolean) ?? []
    if (selectedSegments.length > fallback.length) {
      return selectedSegments
    }
    return fallback
  }, [pathname, selectedSegments])

  const items = React.useMemo(() => createBreadcrumbItems(segments), [segments])

  if (items.length <= 1) {
    return null
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("text-sm text-muted-foreground", className)}
    >
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => (
          <li key={item.href} className="flex items-center gap-1">
            {index > 0 ? (
              <ChevronRight
                aria-hidden="true"
                className="size-3 text-muted-foreground"
              />
            ) : null}
            {item.isCurrent ? (
              <span className="font-medium text-foreground">{item.label}</span>
            ) : (
              <Link
                href={item.href}
                className="transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
