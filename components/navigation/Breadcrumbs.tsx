"use client"

import React from "react"

import { useSelectedLayoutSegments } from "next/navigation"

import { cn } from "@/lib/utils"

import { SmartLink } from "./SmartLink"

export type BreadcrumbLabels = Record<string, string | undefined>

export interface BreadcrumbItem {
  href: string
  label: string
  segment: string
}

export interface BreadcrumbsProps {
  className?: string
  segmentLabels?: BreadcrumbLabels
  segments?: string[]
}

const DEFAULT_SEGMENT_LABELS: Record<string, string> = {
  account: "Account",
  amenities: "Amenities",
  applications: "Applications",
  bookings: "Bookings",
  confirmation: "Confirmation",
  dashboard: "Dashboard",
  documents: "Documents",
  guests: "Guests",
  members: "Members",
  messaging: "Messaging",
  onboarding: "Onboarding",
  payments: "Payments",
  privacy: "Privacy",
  schedule: "Schedule",
  settings: "Settings",
  supplies: "Supplies",
  visitors: "Visitors",
}

const HOME_CRUMB: BreadcrumbItem = {
  segment: "",
  href: "/",
  label: "Home",
}

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const decodeSegment = (segment: string): string => {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

const startCase = (value: string): string => {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
}

const resolveSegmentLabel = (
  segment: string,
  overrides?: BreadcrumbLabels
): string => {
  const decoded = decodeSegment(segment)
  const override = overrides?.[segment] ?? overrides?.[decoded]
  if (hasText(override)) {
    return override
  }

  const lower = decoded.toLowerCase()
  if (DEFAULT_SEGMENT_LABELS[lower]) {
    return DEFAULT_SEGMENT_LABELS[lower]
  }

  return startCase(decoded)
}

export const buildBreadcrumbItems = (
  segments: string[],
  overrides?: BreadcrumbLabels
): BreadcrumbItem[] => {
  const normalizedSegments = segments.filter((segment) => segment && segment !== "")
  const items: BreadcrumbItem[] = [HOME_CRUMB]

  normalizedSegments.forEach((segment, index) => {
    const href = `/${normalizedSegments.slice(0, index + 1).join("/")}`
    const label = resolveSegmentLabel(segment, overrides)
    items.push({
      segment,
      href,
      label,
    })
  })

  return items
}

export default function Breadcrumbs({
  className,
  segmentLabels,
  segments: providedSegments,
}: BreadcrumbsProps) {
  const selectedSegments = useSelectedLayoutSegments()
  const segments = providedSegments ?? selectedSegments
  const items = buildBreadcrumbItems(segments, segmentLabels)

  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm text-muted-foreground", className)}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${item.href}-${item.segment}`} className="flex items-center gap-2">
              {index !== 0 && <span className="text-muted-foreground/60">/</span>}
              {isLast ? (
                <span className="font-medium text-foreground" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <SmartLink
                  href={item.href}
                  className="transition-colors hover:text-foreground"
                  intent="navigation"
                >
                  {item.label}
                </SmartLink>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
