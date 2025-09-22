import { addMinutes, subMinutes, formatISO } from 'date-fns'

export interface BookingRequest {
  start: Date
  end: Date
  bufferMinutes: number
}

export interface BufferedWindow {
  start: Date
  end: Date
}

export interface BufferedSlot {
  range: string
  window: BufferedWindow
}

function assertValidDate(date: Date, label: string) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid date`)
  }
}

export function expandWithBuffer(request: BookingRequest): BufferedSlot {
  assertValidDate(request.start, 'start')
  assertValidDate(request.end, 'end')

  if (request.start >= request.end) {
    throw new Error('start must be before end')
  }

  if (!Number.isFinite(request.bufferMinutes) || request.bufferMinutes < 0) {
    throw new Error('bufferMinutes must be a non-negative number')
  }

  if (!Number.isInteger(request.bufferMinutes)) {
    throw new Error('bufferMinutes must be an integer value')
  }

  const bufferedStart = subMinutes(request.start, request.bufferMinutes)
  const bufferedEnd = addMinutes(request.end, request.bufferMinutes)

  return {
    range: `[${formatISO(bufferedStart)},${formatISO(bufferedEnd)})`,
    window: {
      start: bufferedStart,
      end: bufferedEnd,
    },
  }
}

export function windowsOverlap(a: BufferedWindow, b: BufferedWindow): boolean {
  return a.start < b.end && b.start < a.end
}

export function toBufferedWindow(request: BookingRequest): BufferedWindow {
  return expandWithBuffer(request).window
}

export function collectBufferedWindows(existing: BookingRequest[]): BufferedWindow[] {
  return existing.map((booking) => toBufferedWindow(booking))
}

export function hasBufferedConflictWithWindows(
  existing: BufferedWindow[],
  candidate: BufferedWindow
): boolean {
  return existing.some((window) => windowsOverlap(window, candidate))
}

export function hasBufferedConflict(
  existing: BookingRequest[],
  candidate: BookingRequest
): boolean {
  const candidateWindow = toBufferedWindow(candidate)
  const existingWindows = collectBufferedWindows(existing)
  return hasBufferedConflictWithWindows(existingWindows, candidateWindow)
}
