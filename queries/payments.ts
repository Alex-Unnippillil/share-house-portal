import type { PostgrestSingleResponse } from "@supabase/supabase-js"

import type { Tables } from "@/lib/supabase"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

export type PaymentRecord = Tables<"payments">
export type PaymentWithRelations = PaymentRecord & {
  payer?: Pick<Tables<"profiles">, "full_name" | "email" | "role">
}

const PAYMENT_COLUMNS = `
  id,
  payer_id,
  amount_cents,
  currency,
  status,
  due_date,
  description,
  receipt_path,
  created_at,
  payer:profiles(full_name, email, role)
`

export function getPaymentById(
  client: TypedSupabaseClient,
  paymentId: string,
): Promise<PostgrestSingleResponse<PaymentWithRelations>> {
  return client
    .from("payments")
    .select(PAYMENT_COLUMNS)
    .eq("id", paymentId)
    .limit(1)
    .single()
}
