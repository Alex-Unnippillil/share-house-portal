import React, { Suspense } from 'react'

import { Button } from "@/components/ui/button"
import Link from "next/link"

import { LatestDocumentsSkeleton, RentSummarySkeleton, RoommateBoardSkeleton } from './components/dashboard-skeletons'
import { LatestDocumentsCard } from './components/latest-documents-card'
import { RentSummaryCard } from './components/rent-summary-card'
import { RoommateBoardCard } from './components/roommate-board-card'

export default function DashboardPage() {
  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
        <div className="flex gap-2">
          <Link href="/payments">
            <Button size="sm">Pay rent</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Suspense fallback={<RentSummarySkeleton />}>
          <RentSummaryCard />
        </Suspense>

        <Suspense fallback={<LatestDocumentsSkeleton />}>
          <LatestDocumentsCard />
        </Suspense>
      </div>

      <Suspense fallback={<RoommateBoardSkeleton />}>
        <RoommateBoardCard />
      </Suspense>
    </div>
  )
}