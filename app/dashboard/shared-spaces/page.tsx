import { Metadata } from 'next'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { CreateSharedSpaceForm } from './components/create-shared-space-form'
import { SharedSpaceManagerList } from './components/shared-space-manager'
import { fetchStaffSharedSpaceMaps } from './actions'

export const metadata: Metadata = {
  title: 'Shared Space Maps',
  description:
    'Manage shared space diagrams for tenants by uploading new files, adjusting metadata, and updating lease associations.',
}

export default async function DashboardSharedSpacesPage() {
  const { data: diagrams, error } = await fetchStaffSharedSpaceMaps()

  return (
    <div className="flex flex-col gap-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Shared space maps</h1>
        <p className="max-w-3xl text-muted-foreground">
          Upload and maintain reference diagrams for each lease. Use metadata to annotate room labels and provide contextual notes
          that surface in the tenant experience.
        </p>
      </header>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">{error}</p>
          <p className="mt-1 text-destructive/90">
            If you believe this is a mistake, please contact an administrator or{' '}
            <Link href="/contact" className="underline">
              reach out to support
            </Link>
            .
          </p>
        </div>
      ) : null}

      <CreateSharedSpaceForm />

      {diagrams.length ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Existing diagrams</h2>
            <Button asChild variant="outline">
              <Link href="/shared-spaces">View tenant experience</Link>
            </Button>
          </div>
          <SharedSpaceManagerList diagrams={diagrams} />
        </section>
      ) : !error ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <h2 className="text-lg font-semibold">No diagrams uploaded yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Use the form above to upload the first shared space map for your residents.
          </p>
        </div>
      ) : null}
    </div>
  )
}
