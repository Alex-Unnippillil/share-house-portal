"use client"

import { createBrowserClient } from "@supabase/ssr"
import { useMemo } from "react"

import type { Database } from "@/lib/supabase"
import { createSupabaseClientLoggingConfig } from "@/utils/supabase/logging"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

declare global {
  interface Window {
    __SUPABASE_TRACE_ID__?: string
  }
}

function getBrowserTraceId() {
  if (typeof window === "undefined") {
    return undefined
  }

  if (!window.__SUPABASE_TRACE_ID__ && typeof crypto !== "undefined" && "randomUUID" in crypto) {
    window.__SUPABASE_TRACE_ID__ = crypto.randomUUID()
  }

  return window.__SUPABASE_TRACE_ID__
}

let client: TypedSupabaseClient

function getSupabaseBrowserClient() {
  if (client) {
    return client
  }

  const loggingConfig = createSupabaseClientLoggingConfig({
    traceId: getBrowserTraceId(),
    source: "browser",
  })

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      ...loggingConfig,
      isSingleton: true,
    },
  )

  return client
}

export default function useSupabaseBrowser() {
  return useMemo(getSupabaseBrowserClient, [])
}

// Export the createClient function for compatibility
export const createClient = getSupabaseBrowserClient
