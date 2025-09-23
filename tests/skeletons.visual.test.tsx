import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { BookingStatsSkeleton } from "@/app/bookings/components/booking-skeletons"
import { CountryDetailsSkeleton } from "@/app/countries/[id]/page"
import {
  DocumentsListSkeleton,
  DocumentsStatsSkeleton,
} from "@/app/documents/components/documents-skeletons"
import { RouteSkeleton } from "@/components/feedback/RouteSkeleton"
import { NotificationListSkeleton } from "@/components/notifications/notification-center"

const skeletonCases = [
  ["country details", <CountryDetailsSkeleton />],
  ["documents stats", <DocumentsStatsSkeleton />],
  ["documents list", <DocumentsListSkeleton />],
  ["bookings stats", <BookingStatsSkeleton />],
  ["notification list", <NotificationListSkeleton />],
  ["route", <RouteSkeleton />],
] as const

describe("skeleton visual regressions", () => {
  it.each(skeletonCases)("renders %s skeleton with shared animation", (_name, element) => {
    const markup = renderToStaticMarkup(element)

    expect(markup).toContain("animate-[pulse_0.35s_ease-in-out_infinite]")
    expect(markup).toMatchSnapshot()
  })
})
