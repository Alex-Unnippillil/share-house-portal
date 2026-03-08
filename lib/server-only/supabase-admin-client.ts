"use server"

import "server-only"
import { createClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase"

if (typeof window !== "undefined") {
  throw new Error("The Supabase admin client cannot be imported in the browser.")
}

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

export const adminAuthClient = supabase.auth.admin
