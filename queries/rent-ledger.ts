import { TypedSupabaseClient } from "@/utils/typed-supabase-client"

interface GetRentLedgerParams {
  unitId: string
  limit?: number
  offset?: number
}

export function getRentLedger(
  client: TypedSupabaseClient,
  { unitId, limit = 50, offset = 0 }: GetRentLedgerParams,
) {
  return client
    .from("rent_payments")
    .select(
      `
      id,
      user_id,
      tenant_id,
      unit_id,
      payer_name,
      unit,
      amount,
      currency,
      status,
      payment_method_type,
      description,
      processed_at,
      created_at,
      receipt_url
    `,
    )
    .eq("unit_id", unitId)
    .order("processed_at", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1)
    .throwOnError()
}
