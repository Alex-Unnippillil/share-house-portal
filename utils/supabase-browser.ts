"use client"

import { createBrowserClient } from "@supabase/ssr"
import { useMemo } from "react"

import type { Database } from "@/lib/supabase"
import { getSupabaseAnonKey, getSupabaseUrl } from "@/utils/supabase/env"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

let client: TypedSupabaseClient

function getSupabaseBrowserClient() {
  if (client) {
    return client
  }

  client = createBrowserClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
  )

  return client
}

export default function useSupabaseBrowser() {
  return useMemo(getSupabaseBrowserClient, [])
}

// Export the createClient function for compatibility
export const createClient = getSupabaseBrowserClient
