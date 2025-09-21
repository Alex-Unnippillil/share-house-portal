"use client"

import OfflineBanner from "./offline-banner"
import ThreadPanel from "./thread-panel"
import ThreadSidebar from "./thread-sidebar"
import { MessagesProvider, type MessagesProviderProps } from "./messages-provider"

function MessagesLayout() {
  return (
    <div className="flex flex-col gap-4">
      <OfflineBanner />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <ThreadSidebar />
        <ThreadPanel />
      </div>
    </div>
  )
}

export default function MessagesPageContent(props: MessagesProviderProps) {
  return (
    <MessagesProvider {...props}>
      <MessagesLayout />
    </MessagesProvider>
  )
}
