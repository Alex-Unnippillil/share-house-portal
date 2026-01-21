"use client"

import { useOAuthTokenCache } from "@/hooks/use-oauth-token-cache"

export function OAuthTokenListener() {
  useOAuthTokenCache()

  return null
}

export default OAuthTokenListener
