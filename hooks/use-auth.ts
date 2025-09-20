"use client"

import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"

import useSupabaseBrowser from "@/utils/supabase-browser"

export function useAuth() {
  const supabase = useSupabaseBrowser()
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
