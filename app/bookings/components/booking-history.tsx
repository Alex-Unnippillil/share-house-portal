'use client'

import { FlowStateCard } from "@/components/feedback/flow-state"
import { SemanticStatusBadge } from "@/components/status/semantic-status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCallback, useEffect, useMemo, useState } from 'react'

import { canCancelBooking } from '@/lib/bookings/policy'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type BookingHistoryRow = {
  id: string
  property_id: string
  amenity_name: string
  status: string
  start_time: string
  end_time: string
}

function formatRange(startTime: string, endTime: string) {
  const start = new Date(startTime)
  const end = new Date(endTime)

  return `${start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })} • ${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })}`
}

function statusTone(status: string): "success" | "neutral" | "error" | "warning" {
  if (status === "confirmed") return "success"
  if (status === "pending") return "neutral"
  if (status === "cancelled") return "error"
  return "warning"
function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'confirmed') return 'default'
  if (status === 'pending') return 'secondary'
  if (status === 'cancelled') return 'destructive'
  return 'outline'
}

export function BookingHistory() {
  const [rows, setRows] = useState<BookingHistoryRow[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  const loadRows = useCallback(async (cursor?: string) => {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/bookings/history?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, {
        cache: 'no-store',
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to fetch booking history')
      }

      setRows((previous) => (cursor ? [...previous, ...payload.rows] : payload.rows))
      setNextCursor(payload.nextCursor)
      setHasLoaded(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const tenantRows = useMemo(() => rows.slice(0, 12), [rows])

  const renderRows = (rows: typeof tenantRows, role: "tenant" | "manager") => {
    if (rows.length === 0) {
      return (
        <FlowStateCard
          variant="empty"
          title="No booking activity yet"
          description="Once bookings are mirrored from Cal.com, this calendar will show status, cancellation policy, and property context."
        />
      )
  const renderRows = (list: BookingHistoryRow[], role: 'tenant' | 'manager') => {
    if (!hasLoaded && isLoading) {
      return <p className="text-sm text-muted-foreground">Loading mirrored bookings…</p>
    }

    if (list.length === 0) {
      return <p className="text-sm text-muted-foreground">No mirrored bookings yet.</p>
    }

    return (
      <div className="space-y-3">
        {list.map((booking) => {
          const cancellable = canCancelBooking(booking.start_time, role === 'manager' ? 0 : 2)
          return (
            <Card key={`${role}-${booking.id}`}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{booking.amenity_name}</span>
                  <SemanticStatusBadge status={statusTone(booking.status)} label={booking.status} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>{formatRange(booking.start_time, booking.end_time)}</p>
                <p>Property: {booking.property_id}</p>
                <p>
                  {cancellable
                    ? 'Cancellation allowed within current policy window.'
                    : 'Cancellation locked because the start time is within the tenant policy window.'}
                </p>
              </CardContent>
            </Card>
          )
        })}

        {nextCursor ? (
          <Button variant="outline" disabled={isLoading} onClick={() => void loadRows(nextCursor)}>
            {isLoading ? 'Loading…' : 'Load more'}
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <Tabs defaultValue="tenant" className="space-y-4">
      <TabsList>
        <TabsTrigger value="tenant">Tenant calendar</TabsTrigger>
        <TabsTrigger value="manager">Manager calendar</TabsTrigger>
      </TabsList>

      <TabsContent value="tenant">{renderRows(tenantRows, 'tenant')}</TabsContent>
      <TabsContent value="manager">{renderRows(rows, 'manager')}</TabsContent>
    </Tabs>
  )
}
