import { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { fetchTenantSharedSpaceMaps } from './actions'
import { SharedSpaceDiagramCard } from './components/diagram-viewer'

export const metadata: Metadata = {
  title: 'Shared Spaces',
  description:
    'View the latest diagrams and reference maps for your shared spaces, including room labels and helpful notes from property staff.',
}

export default async function SharedSpacesPage() {
  const result = await fetchTenantSharedSpaceMaps()

  if (result.error === 'Not authenticated') {
    redirect('/auth')
  }

  const diagrams = result.data ?? []

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Shared space diagrams</h1>
        <p className="max-w-3xl text-muted-foreground">
          Explore updated floor plans, amenity layouts, and other shared space diagrams for your lease. Hover over the markers to
          see room labels and notes provided by property staff.
        </p>
      </div>

      {result.error && result.error !== 'Not authenticated' ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Unable to load diagrams</p>
          <p className="mt-1 text-destructive/90">
            {result.error}. Please try again later or{' '}
            <Link href="/contact" className="underline">
              contact support
            </Link>
            .
          </p>
        </div>
      ) : null}

      {!diagrams.length && !result.error ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <h2 className="text-lg font-semibold">No shared space diagrams yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            When your property manager uploads shared space diagrams for your lease you&apos;ll see them here.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/contact">Request an update</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-6">
        {diagrams.map((diagram) => (
          <SharedSpaceDiagramCard key={diagram.id} diagram={diagram} />
        ))}
      </div>
    </div>
  )
}
