import React, { Suspense } from 'react'
import { describe, expect, it } from 'vitest'

import { renderComponentToStream } from './utils/render-stream'

import { LatestDocumentsSkeleton, RentSummarySkeleton, RoommateBoardSkeleton } from '@/app/dashboard/(dashboard)/components/dashboard-skeletons'
import { getNextRentSummary, getRecentDocumentsPreview, getRoommateBoardHighlights } from '@/app/dashboard/(dashboard)/data'

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

describe('dashboard streaming harness', () => {
  it('streams slow dashboard widgets without blocking the shell', async () => {
    const rentSummaryResource = createResource(getNextRentSummary)
    const latestDocsResource = createResource(getRecentDocumentsPreview)
    const roommateResource = createResource(getRoommateBoardHighlights)

    function RentSummaryPreview() {
      const summary = rentSummaryResource.read()
      return (
        <section>
          <h3>Next rent due</h3>
          <p>{summary.amount}</p>
          <p>{summary.dueOn}</p>
        </section>
      )
    }

    function LatestDocumentsPreview() {
      const documents = latestDocsResource.read()
      return (
        <section>
          <h3>Latest documents</h3>
          <ul>
            {documents.map((doc) => (
              <li key={doc.id}>{doc.title}</li>
            ))}
          </ul>
        </section>
      )
    }

    function RoommateBoardPreview() {
      const messages = roommateResource.read()
      return (
        <section>
          <h3>Roommate board</h3>
          <ul>
            {messages.map((message) => (
              <li key={message.id}>
                {message.author}: {message.body}
              </li>
            ))}
          </ul>
        </section>
      )
    }

    function DashboardHarness() {
      return (
        <div>
          <h2>Welcome back</h2>
          <div className="grid">
            <Suspense fallback={<RentSummarySkeleton />}>
              <RentSummaryPreview />
            </Suspense>
            <Suspense fallback={<LatestDocumentsSkeleton />}>
              <LatestDocumentsPreview />
            </Suspense>
          </div>
          <Suspense fallback={<RoommateBoardSkeleton />}>
            <RoommateBoardPreview />
          </Suspense>
        </div>
      )
    }

    const { firstChunk, completed } = await renderComponentToStream(<DashboardHarness />)

    expect(firstChunk).toContain('Welcome back')
    expect(firstChunk).toContain('data-testid="latest-documents-skeleton"')
    expect(firstChunk).toContain('data-testid="roommate-board-skeleton"')

    expect(completed).toContain('Next rent due')
    expect(completed).toContain('Latest documents')
    expect(completed).toContain('Roommate board')
  })
})
