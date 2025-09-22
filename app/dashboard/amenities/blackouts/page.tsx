import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/utils/supabase/server'
import type { AmenityBlackoutSummary } from './blackout-list'
import { BlackoutForm } from './blackout-form'
import { BlackoutList } from './blackout-list'

export const metadata = {
  title: 'Amenity blackouts',
  description: 'Block out maintenance windows so residents cannot book unavailable amenities.',
}

export default async function AmenityBlackoutsPage() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('amenity_blackouts')
    .select('id, amenity_id, starts_at, ends_at, reason')
    .order('starts_at', { ascending: true })

  if (error) {
    console.error('Failed to load amenity blackouts', error)
  }

  const blackouts: AmenityBlackoutSummary[] = (data ?? []).map((blackout) => ({
    id: blackout.id,
    amenity_id: blackout.amenity_id,
    starts_at: blackout.starts_at,
    ends_at: blackout.ends_at,
    reason: blackout.reason,
  }))

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Amenity blackouts</h1>
        <p className="text-muted-foreground">
          Create downtime windows for maintenance, cleaning, or policy changes. Residents attempting to
          book within a blackout will see the corresponding message.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Schedule a blackout</CardTitle>
            <CardDescription>
              Choose an amenity, specify the downtime window, and share a short note for residents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BlackoutForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming downtime</CardTitle>
            <CardDescription>
              Review and remove blackouts that are no longer needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BlackoutList blackouts={blackouts} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
