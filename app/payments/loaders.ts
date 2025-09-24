"use server"

import "server-only"

import { cookies } from "next/headers"

import { catchUpBalances, receiptHistory } from "@/lib/payments/mock-data"
import type { Database } from "@/lib/supabase"
import type {
  CatchUpBalance,
  PaymentReceiptHistoryEntry,
} from "@/types/payments"
import type { IntlPreferences } from "@/lib/utils"
import { createClient } from "@/utils/supa-server-actions"


export async function loadCatchUpBalances(): Promise<CatchUpBalance[]> {
  return catchUpBalances
}

export async function loadReceiptHistory(): Promise<PaymentReceiptHistoryEntry[]> {
  return receiptHistory

}

type ProfilePreferencesRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "locale" | "timezone"
>

export async function loadViewerFormattingPreferences(): Promise<IntlPreferences> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { locale: null, timeZone: null }
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("locale, timezone")
    .eq("id", user.id)
    .maybeSingle<ProfilePreferencesRow>()

  if (error) {
    console.error("Failed to load formatting preferences", error)
  }

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
  const metadataLocale =
    typeof metadata.locale === "string"
      ? metadata.locale
      : typeof metadata.preferred_locale === "string"
        ? metadata.preferred_locale
        : null
  const metadataTimeZone =
    typeof metadata.timezone === "string"
      ? metadata.timezone
      : typeof metadata.timeZone === "string"
        ? metadata.timeZone
        : typeof metadata.preferred_timezone === "string"
          ? metadata.preferred_timezone
          : typeof metadata.preferredTimeZone === "string"
            ? metadata.preferredTimeZone
            : null

  return {
    locale: data?.locale ?? metadataLocale ?? null,
    timeZone: data?.timezone ?? metadataTimeZone ?? null,
  }
}
