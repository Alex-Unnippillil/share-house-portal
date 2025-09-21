import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase";
import { getSupabaseServiceRoleKey } from "@/lib/env";

let serviceClient: SupabaseClient<Database> | undefined;

export function getServiceRoleSupabase(): SupabaseClient<Database> {
  if (!serviceClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!url) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL must be defined for Supabase access.");
    }

    serviceClient = createClient<Database>(url, getSupabaseServiceRoleKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return serviceClient;
}
