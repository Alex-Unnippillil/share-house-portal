"use client"

import type { PostgrestError } from "@supabase/supabase-js"

import useSupabaseBrowser from "@/utils/supabase-browser"

import { useCurrentUser } from "./use-current-user"
import { useSupabaseQuery } from "./use-supabase-query"

export interface UserProfile {
  id: string
  full_name?: string | null
  role?: string | null
  unit_id?: string | null
}

export function useUserProfile() {
  const supabase = useSupabaseBrowser()
  const { data: user } = useCurrentUser()

  return useSupabaseQuery<UserProfile | null, PostgrestError>({
    queryKey: ["profiles", user?.id ?? null],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) return null

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role, unit_id")
        .eq("id", user.id)
        .maybeSingle()

      if (error) throw error

      return (data as UserProfile | null) ?? null
    },
    placeholderData: null,
  })
}
