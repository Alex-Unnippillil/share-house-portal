import type { DocumentListFilters } from '@/types/documents'

import { fetchDocuments } from '../data'
import { DocumentsListClient } from './documents-list-client'

interface DocumentsListProps {
  filter?: DocumentListFilters
  emptyTitle: string
  emptyDescription: string
}

export async function DocumentsList({ filter = {}, emptyTitle, emptyDescription }: DocumentsListProps) {
  const documents = await fetchDocuments(filter)

  return (
    <DocumentsListClient
      documents={documents}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
    />
  )
}
