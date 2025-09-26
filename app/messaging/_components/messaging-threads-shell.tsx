import { MessagingThreadsClient } from "./messaging-threads-client"

import { loadMessagingThreadData } from "../loaders"

export async function MessagingThreadsShell() {
  const initialData = await loadMessagingThreadData()

  return <MessagingThreadsClient initialData={initialData} />
}

