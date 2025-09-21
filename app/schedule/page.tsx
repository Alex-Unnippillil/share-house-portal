import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { AmenityBookingCard } from '@/components/amenities/amenity-booking-card'
import { OvernightRequestForm, type OvernightVisitSummary } from '@/components/amenities/overnight-request-form'
import { fetchCalAvailability } from '@/lib/calcom'

const CAL_BASE_URL = (process.env.NEXT_PUBLIC_CALCOM_BASE_URL ?? 'https://cal.com').replace(/\/$/, '')

export default async function SchedulePage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const { data: amenitiesData, error: amenitiesError } = await supabase
    .from('amenities')
    .select('id, slug, name, description, cal_event_type, approval_required')
    .order('name', { ascending: true })

  if (amenitiesError) {
    throw new Error('Failed to load amenities from Supabase')
  }

  const amenities = amenitiesData ?? []

  const availabilityResults = await Promise.all(
    amenities.map(async (amenity) => {
      try {
        const slots = await fetchCalAvailability(amenity.cal_event_type, {
          startTime: new Date().toISOString(),
        })

        return { amenity, slots, error: null as string | null }
      } catch (error) {
        console.error('Failed to fetch Cal.com availability', error)
        const message =
          error instanceof Error ? error.message : 'Unable to load availability from Cal.com right now.'
        return { amenity, slots: [] as Awaited<ReturnType<typeof fetchCalAvailability>>, error: message }
      }
    })
  )

  const { data: overnightRequestsData } = await supabase
    .from('overnight_visits')
    .select('id, guest_name, guest_email, start_date, end_date, status, notes, approval_notes, created_at')
    .eq('resident_id', user.id)
    .order('created_at', { ascending: false })

  const overnightRequests = (overnightRequestsData ?? []) as OvernightVisitSummary[]

  return (
    <div className="container mx-auto max-w-6xl space-y-8 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Shared amenities & guests</h1>
        <p className="text-muted-foreground">
          Reserve household amenities through Cal.com and keep roommates in the loop. You can also request overnight visitors
          for moderator approval.
        </p>
      </header>

      {amenities.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No amenities are configured yet. Ask an administrator to seed the Supabase amenities table.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {availabilityResults.map(({ amenity, slots, error }) => (
            <AmenityBookingCard
              key={amenity.id}
              amenity={{
                id: amenity.id,
                slug: amenity.slug,
                name: amenity.name,
                description: amenity.description,
                approvalRequired: amenity.approval_required,
                calEventType: amenity.cal_event_type,
              }}
              availability={slots}
              availabilityError={error}
              calLink={`${CAL_BASE_URL}/${amenity.cal_event_type}`}
            />
          ))}
        </div>
      )}

      <OvernightRequestForm requests={overnightRequests} />
    </div>
  )
}
