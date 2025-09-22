"use client"

import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { User } from "@supabase/supabase-js"

import useSupabaseBrowser from "@/utils/supabase-browser"

export const currentUserQueryKey = ["auth", "current-user"] as const

export function useCurrentUser() {
  const supabase = useSupabaseBrowser()
  const queryClient = useQueryClient()

  const queryResult = useQuery<User | null>({
    queryKey: currentUserQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error
      return data.user ?? null
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      queryClient.setQueryData(currentUserQueryKey, session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, queryClient])

  return queryResult
}
