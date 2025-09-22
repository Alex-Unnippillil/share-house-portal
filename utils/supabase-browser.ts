"use client"

import { createBrowserClient } from "@supabase/ssr"
import { createContext, useContext, useMemo, type ReactNode } from "react"

import type { Database } from "@/lib/supabase"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

type SupabaseBrowserInstrumentation = {
  initCount: number
  lastInitializedAt?: number
}

const globalForSupabase = globalThis as unknown as {
  supabaseBrowserClient?: TypedSupabaseClient
  supabaseBrowserInstrumentation?: SupabaseBrowserInstrumentation
}

function getInstrumentation(): SupabaseBrowserInstrumentation {
  if (!globalForSupabase.supabaseBrowserInstrumentation) {
    globalForSupabase.supabaseBrowserInstrumentation = { initCount: 0 }
  }

  return globalForSupabase.supabaseBrowserInstrumentation
}

function createSupabaseBrowserClient(): TypedSupabaseClient {
  const instrumentation = getInstrumentation()
  instrumentation.initCount += 1
  instrumentation.lastInitializedAt = Date.now()

  if (!globalForSupabase.supabaseBrowserClient) {
    globalForSupabase.supabaseBrowserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )
  }

  return globalForSupabase.supabaseBrowserClient
}

export function getSupabaseBrowserClient(): TypedSupabaseClient {
  if (!globalForSupabase.supabaseBrowserClient) {
    return createSupabaseBrowserClient()
  }

  return globalForSupabase.supabaseBrowserClient
}

const SupabaseClientContext = createContext<TypedSupabaseClient | null>(null)

export function SupabaseClientProvider({
  children,
  client,
}: {
  children: ReactNode
  client?: TypedSupabaseClient
}) {
  const value = useMemo(() => client ?? getSupabaseBrowserClient(), [client])

  return (
    <SupabaseClientContext.Provider value={value}>
      {children}
    </SupabaseClientContext.Provider>
  )
}

export function useSupabaseClient(): TypedSupabaseClient {
  const client = useContext(SupabaseClientContext)

  if (client) {
    return client
  }

  return getSupabaseBrowserClient()
}

export default function useSupabaseBrowser(): TypedSupabaseClient {
  return useSupabaseClient()
}

export function getSupabaseBrowserClientTrace(): SupabaseBrowserInstrumentation {
  return { ...getInstrumentation() }
}

// Export the createClient function for compatibility
export const createClient = getSupabaseBrowserClient