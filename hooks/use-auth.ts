"use client"

import { useEffect, useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"

import { createBrowserClient } from "@/lib/supabase-client"

export function useAuth() {
  const supabase = useMemo(() => createBrowserClient(), [])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  return { user, loading }
}
