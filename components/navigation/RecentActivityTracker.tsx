"use client"

import { useEffect, useMemo, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { recordRecentActivity } from "@/lib/recent-activity"
import { useAuth } from "@/hooks/use-auth"
import useSupabaseBrowser from "@/utils/supabase-browser"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

type Nullable<T> = T | null | undefined

function deriveLabel(pathname: Nullable<string>) {
  if (typeof document !== "undefined" && document.title) {
    const [primary] = document.title.split(" - ")
    if (primary?.trim()) {
      return primary.trim()
    }
    return document.title.trim()
  }

  if (!pathname) {
    return "Dashboard"
  }

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((segment) =>
      segment
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase()),
    )

  if (segments.length === 0) {
    return "Dashboard"
  }

  return segments.join(" › ")
}

export function RecentActivityTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const supabase = useSupabaseBrowser()
  const lastRecordedRef = useRef<string>("")

  const serializedSearch = useMemo(() => searchParams?.toString() ?? "", [searchParams])

  useEffect(() => {
    if (!pathname) {
      return
    }

    const route = serializedSearch ? `${pathname}?${serializedSearch}` : pathname
    if (route === lastRecordedRef.current) {
      return
    }

    lastRecordedRef.current = route

    const label = deriveLabel(pathname)

    void recordRecentActivity(
      {
        route,
        label,
      },
      {
        supabase: user ? (supabase as unknown as TypedSupabaseClient) : null,
        userId: user?.id,
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
      },
    )
  }, [pathname, serializedSearch, supabase, user])

  return null
}

export default RecentActivityTracker
