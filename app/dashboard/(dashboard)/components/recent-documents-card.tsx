import { getRecentDocuments } from "../data"
import { RecentDocumentsCardClient } from "./recent-documents-card.client"

export async function RecentDocumentsCard() {
  const documents = await getRecentDocuments()
  return <RecentDocumentsCardClient documents={documents} />
}
