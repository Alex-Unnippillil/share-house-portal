"use client"

import { WifiOff } from "lucide-react"

import { useMessagesContext } from "./messages-provider"

export default function OfflineBanner() {
  const { isOnline, pendingCount } = useMessagesContext()

  if (isOnline && pendingCount === 0) {
    return null
  }

  const message = !isOnline
    ? "You are offline. New messages will be queued and sent when you reconnect."
    : `Syncing ${pendingCount} pending update${pendingCount === 1 ? "" : "s"}...`

  return (
    <div className="flex items-center gap-3 rounded-md border border-amber-500/60 bg-amber-100/70 p-3 text-sm text-amber-900 shadow-sm dark:border-amber-400/50 dark:bg-amber-900/30 dark:text-amber-200">
      <WifiOff className="size-4" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}
