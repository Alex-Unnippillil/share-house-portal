"use client"

import { WifiOff } from "lucide-react"

import { useSupabaseConnectivity } from "./supabase-connectivity-provider"

export function SupabaseOfflineBanner() {
  const { status, pendingMutations } = useSupabaseConnectivity()

  if (status === "online") {
    return null
  }

  const isOffline = status === "offline"
  const bannerColor = isOffline ? "bg-rose-600" : "bg-amber-500"
  const label = isOffline ? "Offline mode" : "Reconnecting to Supabase"
  const pendingLabel =
    pendingMutations > 0
      ? `${pendingMutations} pending update${pendingMutations === 1 ? "" : "s"}`
      : "Changes sync automatically once the connection is restored."

  return (
    <div className={`sticky top-0 z-50 w-full ${bannerColor} text-white`}>
      <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-2 text-sm md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="flex items-center gap-2">
          <WifiOff className="size-4" aria-hidden="true" />
          <span className="font-medium">{label}</span>
          {pendingMutations > 0 && (
            <span className="text-xs text-white/80">{pendingLabel}</span>
          )}
        </div>
        {pendingMutations === 0 && (
          <span className="text-xs text-white/80">{pendingLabel}</span>
        )}
      </div>
    </div>
  )
}
