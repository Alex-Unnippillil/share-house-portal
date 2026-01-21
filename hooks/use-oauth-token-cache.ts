"use client"

import { useEffect } from "react"

import useSupabaseBrowser from "@/utils/supabase-browser"

const PROVIDER_TOKEN_KEY = "oauth_provider_token"
const PROVIDER_REFRESH_TOKEN_KEY = "oauth_provider_refresh_token"

export function useOAuthTokenCache() {
  const supabase = useSupabaseBrowser()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (typeof window === "undefined") {
        return
      }

      const providerToken = session?.provider_token
      const providerRefreshToken = session?.provider_refresh_token

      if (providerToken) {
        window.localStorage.setItem(PROVIDER_TOKEN_KEY, providerToken)
      } else {
        window.localStorage.removeItem(PROVIDER_TOKEN_KEY)
      }

      if (providerRefreshToken) {
        window.localStorage.setItem(
          PROVIDER_REFRESH_TOKEN_KEY,
          providerRefreshToken,
        )
      } else {
        window.localStorage.removeItem(PROVIDER_REFRESH_TOKEN_KEY)
      }

      if (event === "SIGNED_OUT") {
        window.localStorage.removeItem(PROVIDER_TOKEN_KEY)
        window.localStorage.removeItem(PROVIDER_REFRESH_TOKEN_KEY)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])
}

export default useOAuthTokenCache
