"use server"

import { formatISO } from "date-fns"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import { createClient } from "@/utils/supa-server-actions"
import { autopayFormSchema, type AutopayFormValues } from "@/lib/payments/autopay-schema"
import {
  calculateNextDueDate,
  formatDateForSql,
  type RentPaymentScheduleRow,
} from "@/lib/payments/autopay-scheduler"
import { ensureScheduleTimeline } from "@/lib/payments/autopay-service"

export type AutoPayActionState = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

const initialActionState: AutoPayActionState = {
  success: false,
  message: "",
}

export function getInitialAutoPayActionState(): AutoPayActionState {
  return { ...initialActionState }
}

export async function saveAutoPaySettings(values: AutopayFormValues): Promise<AutoPayActionState> {
  const parsed = autopayFormSchema.safeParse(values)
  if (!parsed.success) {
    return {
      success: false,
      message: "Please resolve the highlighted issues before saving.",
      errors: parsed.error.flatten().fieldErrors,
    }
  }

  const payload = parsed.data
  const rentAmountCents = Math.round(payload.rentAmount * 100)
  const currency = payload.currency.toUpperCase()
  const lateFeeFlatCents =
    payload.lateFeeType === "flat" ? Math.round((payload.lateFeeFlat ?? 0) * 100) : null
  const lateFeePercent = payload.lateFeeType === "percentage" ? payload.lateFeePercent ?? 0 : null
  const lateFeeCapCents = payload.lateFeeCap != null ? Math.round(payload.lateFeeCap * 100) : null

  const firstChargeDate = payload.firstChargeDate
  const firstChargeDateSql = formatDateForSql(firstChargeDate)
  const nextDueDate = calculateNextDueDate(payload.dayOfMonth, new Date(), firstChargeDate)
  const nextRunDateSql = formatDateForSql(nextDueDate)

  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user || authError) {
    return {
      success: false,
      message: "You must be signed in to manage AutoPay settings.",
    }
  }

  const { data: existingSchedule, error: fetchError } = await supabase
    .from("rent_payment_schedules")
    .select("*")
    .eq("tenant_id", user.id)
    .maybeSingle<RentPaymentScheduleRow>()

  if (fetchError) {
    console.error("Failed to load existing AutoPay schedule", fetchError)
    return {
      success: false,
      message: "Unable to load your AutoPay configuration.",
    }
  }

  const baseFields = {
    tenant_id: user.id,
    rent_amount_cents: rentAmountCents,
    currency,
    day_of_month: payload.dayOfMonth,
    timezone: payload.timezone,
    autopay_enabled: payload.autopayEnabled,
    grace_period_days: payload.gracePeriodDays,
    late_fee_type: payload.lateFeeType,
    late_fee_flat_cents: payload.lateFeeType === "flat" ? lateFeeFlatCents : null,
    late_fee_percent: payload.lateFeeType === "percentage" ? lateFeePercent : null,
    late_fee_cap_cents: lateFeeCapCents,
    anchor_date: firstChargeDateSql,
    next_run_date: nextRunDateSql,
    updated_at: formatISO(new Date()),
  }

  let schedule: RentPaymentScheduleRow | null = null

  if (existingSchedule) {
    const { data, error: updateError } = await supabase
      .from("rent_payment_schedules")
      .update(baseFields)
      .eq("id", existingSchedule.id)
      .select("*")
      .single<RentPaymentScheduleRow>()

    if (updateError) {
      console.error("Failed to update AutoPay schedule", updateError)
      return {
        success: false,
        message: "We couldn't update your AutoPay settings. Please try again.",
      }
    }

    schedule = data
  } else {
    const { data, error: insertError } = await supabase
      .from("rent_payment_schedules")
      .insert([{ ...baseFields, created_at: formatISO(new Date()) }])
      .select("*")
      .single<RentPaymentScheduleRow>()

    if (insertError) {
      console.error("Failed to create AutoPay schedule", insertError)
      return {
        success: false,
        message: "We couldn't create your AutoPay schedule. Please try again.",
      }
    }

    schedule = data
  }

  if (!schedule) {
    return {
      success: false,
      message: "An unexpected error occurred while saving your settings.",
    }
  }

  await ensureScheduleTimeline(supabase, schedule)
  revalidatePath("/payments")

  return {
    success: true,
    message: existingSchedule
      ? "AutoPay settings updated successfully."
      : "AutoPay schedule created successfully.",
  }
}
