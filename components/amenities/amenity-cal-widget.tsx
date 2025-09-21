'use client'

import { Cal, getCalApi } from '@calcom/embed-react'
import { useEffect } from 'react'

type AmenityCalWidgetProps = {
  calLink: string
  onBookingComplete?: (payload: unknown) => void
}

export function AmenityCalWidget({ calLink, onBookingComplete }: AmenityCalWidgetProps) {
  useEffect(() => {
    let isMounted = true

    async function initCal() {
      const cal = await getCalApi()
      if (!isMounted) return

      cal('ui', { theme: 'auto' })

      if (onBookingComplete) {
        cal('on', {
          action: 'bookingSuccessful',
          callback: (event: { detail?: unknown }) => {
            onBookingComplete(event?.detail)
          },
        })
      }
    }

    void initCal()

    return () => {
      isMounted = false
      ;(async () => {
        const cal = await getCalApi().catch(() => null)
        if (cal && onBookingComplete) {
          try {
            cal('off', { action: 'bookingSuccessful' })
          } catch {
            // ignore detach errors
          }
        }
      })()
    }
  }, [calLink, onBookingComplete])

  return <Cal calLink={calLink} style={{ width: '100%', minHeight: '600px' }} />
}
