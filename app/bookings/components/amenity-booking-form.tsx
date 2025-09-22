'use client'

import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'

import { Button } from '@/components/ui/button'
import type { AmenitySlot } from '@/types/supabase'
import { toast } from 'sonner'

interface Amenity {
  slug: string
  name: string
  durationLabel: string
  maxAdvanceLabel: string
}

interface AmenityBookingFormProps {
  amenity: Amenity
  nextAvailableSlot: AmenitySlot | null
}

function formatSlot(slot: AmenitySlot): string {
  return `${format(parseISO(slot.start), 'EEE MMM d · p')} → ${format(parseISO(slot.end), 'p')}`
}

export function AmenityBookingForm({
  amenity,
  nextAvailableSlot,
}: AmenityBookingFormProps) {
  const [loading, setLoading] = useState(false)

  const nextSlotLabel = useMemo(() => {
    if (!nextAvailableSlot) {
      return null
    }
    return formatSlot(nextAvailableSlot)
  }, [nextAvailableSlot])

  const handleBook = async () => {
    setLoading(true)
    try {
      if (nextAvailableSlot) {
        toast.success(
          `Launching booking flow for ${amenity.name} on ${format(
            parseISO(nextAvailableSlot.start),
            'MMM d @ p',
          )}`,
        )
      } else {
        toast.success(`We'll alert the household when a ${amenity.name} slot opens up.`)
      }
    } finally {
      setLoading(false)
    }
  }

  const buttonLabel = nextAvailableSlot ? 'Book next slot' : 'Notify me'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium">Next availability</span>
        <span>{nextSlotLabel ?? 'None in window'}</span>
      </div>
      <Button onClick={handleBook} disabled={loading} className="w-full">
        {loading ? 'Checking…' : buttonLabel}
      </Button>
    </div>
  )
}
