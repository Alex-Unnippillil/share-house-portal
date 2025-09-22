import { describe, expect, it } from 'vitest'
import { addMinutes, subMinutes, formatISO } from 'date-fns'

import {
  expandWithBuffer,
  hasBufferedConflict,
  type BookingRequest,
} from '@/lib/bookings'

describe('expandWithBuffer', () => {
  const start = new Date('2024-05-01T10:00:00Z')
  const end = new Date('2024-05-01T11:00:00Z')

  it('expands the stored range by the configured buffer', () => {
    const bufferMinutes = 15
    const result = expandWithBuffer({ start, end, bufferMinutes })

    const expectedStart = subMinutes(start, bufferMinutes)
    const expectedEnd = addMinutes(end, bufferMinutes)

    expect(result.range).toBe(`[${formatISO(expectedStart)},${formatISO(expectedEnd)})`)
    expect(result.window.start.getTime()).toBe(expectedStart.getTime())
    expect(result.window.end.getTime()).toBe(expectedEnd.getTime())
  })

  it('rejects negative buffer inputs', () => {
    expect(() =>
      expandWithBuffer({ start, end, bufferMinutes: -5 })
    ).toThrow(/non-negative/)
  })
})

describe('hasBufferedConflict', () => {
  const existing: BookingRequest[] = [
    {
      start: new Date('2024-06-01T10:00:00Z'),
      end: new Date('2024-06-01T11:00:00Z'),
      bufferMinutes: 15,
    },
  ]

  it('detects conflicts when the candidate sits inside an existing buffer window', () => {
    const candidate: BookingRequest = {
      start: new Date('2024-06-01T11:05:00Z'),
      end: new Date('2024-06-01T12:00:00Z'),
      bufferMinutes: 15,
    }

    expect(hasBufferedConflict(existing, candidate)).toBe(true)
  })

  it('allows a booking that starts exactly after the buffer window ends', () => {
    const candidate: BookingRequest = {
      start: new Date('2024-06-01T11:30:00Z'),
      end: new Date('2024-06-01T12:30:00Z'),
      bufferMinutes: 15,
    }

    expect(hasBufferedConflict(existing, candidate)).toBe(false)
  })
})
