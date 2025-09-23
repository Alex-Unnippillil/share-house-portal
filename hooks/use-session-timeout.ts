"use client"

import { useSessionTimeoutContext } from "@/components/session/session-timeout-provider"

export function useSessionTimeout() {
  return useSessionTimeoutContext()
}

export { useSessionTimeoutContext } from "@/components/session/session-timeout-provider"
