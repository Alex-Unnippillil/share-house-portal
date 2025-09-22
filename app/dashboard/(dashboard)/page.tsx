import { Suspense } from "react"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import LatestDocumentsCard from "./components/latest-documents-card"
import RoommateBoardCard from "./components/roommate-board-card"

export default function DashboardPage() {
  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
        <div className="flex gap-2">
          <Button size="sm" asChild>
            <Link href="/payments">Pay rent</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Next rent due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Amount</div>
            <div className="text-2xl font-semibold">$1,260.00</div>
            <div className="mt-1 text-sm text-muted-foreground">Due on the 1st</div>
            <Button size="sm" className="mt-4" asChild>
              <Link href="/payments">View details</Link>
            </Button>
          </CardContent>
        </Card>

        <Suspense fallback={<CardSkeleton title="Latest documents" />}>
          <LatestDocumentsCard />
        </Suspense>
      </div>

      <Suspense fallback={<CardSkeleton title="Roommate board" fullWidth />}>
        <RoommateBoardCard />
      </Suspense>
    </div>
  )
}

function CardSkeleton({ title, fullWidth }: { title: string; fullWidth?: boolean }) {
  const cardClasses = fullWidth
    ? "min-h-[16rem]"
    : "min-h-[16rem] md:col-span-1"

  return (
    <Card className={cardClasses}>
      <CardHeader>
        <CardTitle className="h-6 w-40 animate-pulse rounded bg-muted" aria-hidden />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-muted" aria-hidden />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" aria-hidden />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" aria-hidden />
      </CardContent>
      <span className="sr-only">Loading {title}</span>
    </Card>
  )
}
