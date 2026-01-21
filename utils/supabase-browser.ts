"use client"

import { createBrowserClient } from "@supabase/ssr"
import { useMemo } from "react"

import type { Database } from "@/lib/supabase"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"
import { getSupabaseClientConfig } from "@/utils/supabase/env"

let client: TypedSupabaseClient

function getSupabaseBrowserClient() {
  if (client) {
    return client
  }

  const { url, anonKey } = getSupabaseClientConfig()

  client = createBrowserClient<Database>(
    url,
    anonKey,
  )

  return client
}

export default function useSupabaseBrowser() {
  return useMemo(getSupabaseBrowserClient, [])
}

// Export the createClient function for compatibility
export const createClient = getSupabaseBrowserClient
