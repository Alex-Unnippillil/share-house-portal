import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase"
import { ScimError } from "./errors"

let cachedClient: SupabaseClient<Database> | null = null

export function getServiceRoleClient() {
  if (cachedClient) return cachedClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new ScimError(
      500,
      "Supabase service role credentials are not configured"
    )
  }

  cachedClient = createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return cachedClient
}
