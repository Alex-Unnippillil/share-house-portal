import { startOfDay } from "date-fns"
import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase"

import {
  buildLateFeeConfig,
  calculateGraceDate,
  calculateLateFee,
  deriveOccurrenceStatus,
  formatDateForSql,
  generateScheduleWindow,
  getNextRunDate,
  type RentPaymentOccurrenceRow,
  type RentPaymentScheduleRow,
} from "./autopay-scheduler"

export type PaymentsSupabaseClient = SupabaseClient<Database>

export async function ensureScheduleTimeline(
  client: PaymentsSupabaseClient,
  schedule: RentPaymentScheduleRow,
  options?: { monthsForward?: number; monthsBack?: number; now?: Date }
): Promise<boolean> {
  const now = options?.now ?? new Date()
  const monthsForward = options?.monthsForward ?? 6
  const monthsBack = options?.monthsBack ?? 1

  const dueDates = generateScheduleWindow({
    anchorDate: new Date(schedule.anchor_date),
    dayOfMonth: schedule.day_of_month,
    now,
    monthsForward,
    monthsBack,
  })

  const { data: existingOccurrences, error: existingError } = await client
    .from("rent_payment_occurrences")
    .select("*")
    .eq("schedule_id", schedule.id)
    .order("due_date", { ascending: true })

  if (existingError) {
    console.error("Failed to fetch rent payment occurrences", existingError)
    return false
  }

  const occurrenceMap = new Map<string, RentPaymentOccurrenceRow>()
  for (const occurrence of existingOccurrences ?? []) {
    occurrenceMap.set(occurrence.due_date, occurrence)
  }

  let mutated = false
  const startOfToday = startOfDay(now)

  const newRecords = dueDates
    .filter((dueDate) => !occurrenceMap.has(formatDateForSql(dueDate)))
    .map((dueDate) => {
      const dueDateSql = formatDateForSql(dueDate)
      const graceSql = formatDateForSql(calculateGraceDate(dueDate, schedule.grace_period_days))
      const isPastDue = startOfDay(dueDate) < startOfToday
      const status = schedule.autopay_enabled
        ? isPastDue
          ? "processing"
          : "queued"
        : isPastDue
          ? "overdue"
          : "scheduled"

      return {
        schedule_id: schedule.id,
        due_date: dueDateSql,
        amount_cents: schedule.rent_amount_cents,
        status,
        grace_expires_on: graceSql,
        late_fee_cents: 0,
      }
    })

  if (newRecords.length > 0) {
    const { error: insertError } = await client.from("rent_payment_occurrences").insert(newRecords)
    if (insertError) {
      console.error("Failed to insert rent payment occurrences", insertError)
    } else {
      mutated = true
    }
  }

  const existing = occurrenceMap.size > 0 ? Array.from(occurrenceMap.values()) : []
  const lateFeeConfig = buildLateFeeConfig(schedule)
  const updates: Array<{ id: string; patch: Partial<RentPaymentOccurrenceRow> }> = []

  for (const occurrence of existing) {
    const dueDate = startOfDay(new Date(occurrence.due_date))
    const desiredGrace = formatDateForSql(calculateGraceDate(dueDate, schedule.grace_period_days))
    const paidAt = occurrence.paid_at ? new Date(occurrence.paid_at) : undefined
    const computedLateFee = calculateLateFee(schedule.rent_amount_cents, lateFeeConfig, {
      dueDate,
      gracePeriodDays: schedule.grace_period_days,
      now,
      paidAt,
    })
    const derivedStatus = deriveOccurrenceStatus(schedule, occurrence, now)

    const patch: Partial<RentPaymentOccurrenceRow> = {}
    if (occurrence.amount_cents !== schedule.rent_amount_cents) {
      patch.amount_cents = schedule.rent_amount_cents
    }
    if (occurrence.grace_expires_on !== desiredGrace) {
      patch.grace_expires_on = desiredGrace
    }
    if (occurrence.late_fee_cents !== computedLateFee) {
      patch.late_fee_cents = computedLateFee
    }

    if (
      occurrence.status !== derivedStatus &&
      !["paid", "failed", "skipped"].includes(occurrence.status)
    ) {
      patch.status = derivedStatus
    }

    if (Object.keys(patch).length > 0) {
      updates.push({ id: occurrence.id, patch })
    }
  }

  for (const update of updates) {
    const { id, patch } = update
    const { error: updateError } = await client
      .from("rent_payment_occurrences")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (updateError) {
      console.error("Failed to update rent payment occurrence", updateError)
    } else {
      mutated = true
    }
  }

  const nextRunDate = formatDateForSql(getNextRunDate(schedule, now))
  if (schedule.next_run_date !== nextRunDate) {
    const { error: nextRunError } = await client
      .from("rent_payment_schedules")
      .update({ next_run_date: nextRunDate, updated_at: new Date().toISOString() })
      .eq("id", schedule.id)

    if (nextRunError) {
      console.error("Failed to update next run date for rent payment schedule", nextRunError)
    } else {
      mutated = true
    }
  }

  return mutated
}
