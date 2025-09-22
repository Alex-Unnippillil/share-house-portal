import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"

import type { Database } from "@/lib/supabase"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"
import {
  createInstrumentedFetch,
  type QueryLoggingContext,
} from "@/utils/observability/query-logging"

export function createSupbaseServerClientReadOnly(
  context?: QueryLoggingContext
): TypedSupabaseClient {
  const cookieStore = cookies()
  const instrumentationContext: QueryLoggingContext = {
    ...context,
    operation: context?.operation ?? "read",
    metadata: {
      client: "server-readonly",
      ...(context?.metadata ?? {}),
    },
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
      options: {
        global: {
          fetch: createInstrumentedFetch(instrumentationContext),
        },
      },
    }
  ) as TypedSupabaseClient
}

export function createSupbaseServerClient(
  context?: QueryLoggingContext
): TypedSupabaseClient {
  const cookieStore = cookies()
  const instrumentationContext: QueryLoggingContext = {
    ...context,
    operation: context?.operation ?? "mutate",
    metadata: {
      client: "server",
      ...(context?.metadata ?? {}),
    },
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options })
        },
      },
      options: {
        global: {
          fetch: createInstrumentedFetch(instrumentationContext),
        },
      },
    }
  ) as TypedSupabaseClient
}