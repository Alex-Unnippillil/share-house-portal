import type { AmenityCatalogItem } from "@/lib/bookings/amenity-catalog"

export interface RecurrenceInput {
  enabled: boolean
  frequency?: "daily" | "weekly"
  count?: number
}

export interface BookingPolicyValidationResult {
  allowed: boolean
  errors: string[]
  warnings: string[]
}

export function validateBookingPolicy({
  amenity,
  startTime,
  endTime,
  recurrence,
}: {
  amenity: AmenityCatalogItem
  startTime: string
  endTime: string
  recurrence: RecurrenceInput
}): BookingPolicyValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const start = new Date(startTime)
  const end = new Date(endTime)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    errors.push("Start and end time must be valid dates.")
    return { allowed: false, errors, warnings }
  }

  if (end <= start) {
    errors.push("End time must be later than start time.")
  }

  const durationMinutes = (end.getTime() - start.getTime()) / 60000
  if (durationMinutes > amenity.durationMinutes) {
    errors.push(`This amenity allows up to ${amenity.durationMinutes} minutes per reservation.`)
  }

  const maxAdvanceDate = new Date()
  maxAdvanceDate.setDate(maxAdvanceDate.getDate() + amenity.maxAdvanceDays)
  if (start > maxAdvanceDate) {
    errors.push(`Bookings for ${amenity.amenityName} can only be made ${amenity.maxAdvanceDays} days in advance.`)
  }

  if (recurrence.enabled) {
    if (!recurrence.frequency || !recurrence.count) {
      errors.push("Recurring bookings require both frequency and occurrence count.")
    } else {
      if (recurrence.count > amenity.maxRecurringOccurrences) {
        errors.push(
          `Recurring bookings for ${amenity.amenityName} are limited to ${amenity.maxRecurringOccurrences} occurrences.`,
        )
      }

      if (recurrence.frequency === "daily" && recurrence.count > amenity.maxConsecutiveDays) {
        errors.push(
          `${amenity.amenityName} supports at most ${amenity.maxConsecutiveDays} consecutive daily reservations.`,
        )
      }

      if (recurrence.frequency === "weekly" && recurrence.count > Math.ceil(amenity.maxRecurringOccurrences / 2)) {
        warnings.push("Large weekly recurrence set detected. Property manager review may be required.")
      }
    }
  }

  return {
    allowed: errors.length === 0,
    errors,
    warnings,
  }
}

export function canCancelBooking(startTime: string, cancellationWindowHours: number) {
  const start = new Date(startTime)
  if (Number.isNaN(start.getTime())) {
    return false
  }

  const hoursUntilStart = (start.getTime() - Date.now()) / 3_600_000
  return hoursUntilStart >= cancellationWindowHours
}
