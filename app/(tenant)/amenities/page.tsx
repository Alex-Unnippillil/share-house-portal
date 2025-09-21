import { redirect } from 'next/navigation'

import { AmenityBooking } from '@/app/(tenant)/amenities/components/amenity-booking'
import { fetchAmenityCatalog, fetchTenantReservations } from '@/app/(tenant)/amenities/actions'
import { createSupbaseServerClientReadOnly } from '@/utils/supaone'

export default async function TenantAmenitiesPage() {
  const supabase = await createSupbaseServerClientReadOnly()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const [amenities, reservations] = await Promise.all([
    fetchAmenityCatalog(),
    fetchTenantReservations(),
  ])

  return (
    <div className="container space-y-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Book a community amenity</h1>
        <p className="text-muted-foreground">
          Browse available amenities, review any house rules, and send a reservation request for the time slot that
          works best for you.
        </p>
      </div>
      <AmenityBooking amenities={amenities} reservations={reservations} />
    </div>
  )
}
