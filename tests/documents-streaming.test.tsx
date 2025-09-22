import React, { Suspense } from 'react'
import { describe, expect, it } from 'vitest'

import { renderComponentToStream } from './utils/render-stream'

import { DocumentsListSkeleton, DocumentsStatsSkeleton } from '@/app/documents/components/skeletons'
import { fetchDocumentStats, fetchDocuments } from '@/app/documents/data'

globalThis.React = React

function createResource<T>(loader: () => Promise<T>) {
  let status: 'pending' | 'success' | 'error' = 'pending'
  let response: T
  let error: unknown

  const promise = loader().then(
    (value) => {
      status = 'success'
      response = value
    },
    (err) => {
      status = 'error'
      error = err
    },
  )

  return {
    read() {
      if (status === 'pending') {
        throw promise
      }
      if (status === 'error') {
        throw error
      }
      return response
    },
  }
}

describe('documents streaming harness', () => {
  it('streams document stats and listings independently', async () => {
    const statsResource = createResource(fetchDocumentStats)
    const documentsResource = createResource(() => fetchDocuments({}))

    function DocumentsStatsPreview() {
      const stats = statsResource.read()

      return (
        <section>
          <h3>Documents overview</h3>
          <dl>
            <div>
              <dt>Total Documents</dt>
              <dd>{stats.total_documents}</dd>
            </div>
            <div>
              <dt>Pending Signatures</dt>
              <dd>{stats.pending_signatures}</dd>
            </div>
          </dl>
        </section>
      )
    }

    function DocumentsListPreview() {
      const documents = documentsResource.read()

      return (
        <section>
          <h3>All documents</h3>
          <ul>
            {documents.map((doc) => (
              <li key={doc.id}>{doc.title}</li>
            ))}
          </ul>
        </section>
      )
    }

    function DocumentsHarness() {
      return (
        <div>
          <h2>Documents</h2>
          <Suspense fallback={<DocumentsStatsSkeleton />}>
            <DocumentsStatsPreview />
          </Suspense>
          <Suspense fallback={<DocumentsListSkeleton variant="all" />}>
            <DocumentsListPreview />
          </Suspense>
        </div>
      )
    }

    const { firstChunk, completed } = await renderComponentToStream(<DocumentsHarness />)

    expect(firstChunk).toContain('Documents')
    expect(firstChunk).toContain('data-testid="documents-stats-skeleton"')
    expect(firstChunk).toContain('data-testid="documents-list-skeleton-all"')

    expect(completed).toContain('Documents overview')
    expect(completed).toContain('All documents')
    expect(completed).toContain('Lease agreement v2.pdf')
  })
})
