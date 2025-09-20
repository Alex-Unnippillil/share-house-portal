import { redirect } from 'next/navigation'

import { CreateAmenityForm } from '@/app/dashboard/amenities/components/create-amenity-form'
import { AmenityCard } from '@/app/dashboard/amenities/components/amenity-card'
import { ReservationList } from '@/app/dashboard/amenities/components/reservation-list'
import type { Database } from '@/lib/supabase'
import { createSupbaseServerClientReadOnly } from '@/utils/supaone'

type Amenity = Database['public']['Tables']['amenities']['Row']
type ReservationWithRelations = Database['public']['Tables']['amenity_reservations']['Row'] & {
  amenities: { name: string } | null
  lease: { full_name: string | null; email: string | null } | null
}

export default async function AmenitiesAdminPage() {
  const supabase = await createSupbaseServerClientReadOnly()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || !['admin', 'staff'].includes(profile.role ?? '')) {
    redirect('/dashboard')
  }

  const { data: amenities, error: amenitiesError } = await supabase
    .from('amenities')
    .select('*')
    .order('name', { ascending: true })

  if (amenitiesError) {
    console.error('Failed to load amenities for dashboard', amenitiesError)
  }

  const { data: reservations, error: reservationsError } = await supabase
    .from('amenity_reservations')
    .select('id, amenity_id, start_time, end_time, status, amenities(name), lease:profiles(full_name, email)')
    .order('start_time', { ascending: false })

  if (reservationsError) {
    console.error('Failed to load amenity reservations', reservationsError)
  }

  const amenityList = (amenities ?? []) as Amenity[]
  const reservationList = (reservations ?? []) as ReservationWithRelations[]

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Amenity management</h1>
        <p className="text-muted-foreground">
          Publish shared resources, maintain policies, and process tenant reservation requests from one place.
        </p>
      </div>

      <CreateAmenityForm />

      <div className="grid gap-6 lg:grid-cols-2">
        {amenityList.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground lg:col-span-2">
            No amenities configured yet. Use the form above to add your first resource.
          </p>
        ) : (
          amenityList.map((amenity) => <AmenityCard key={amenity.id} amenity={amenity} />)
        )}
      </div>

      <ReservationList reservations={reservationList} />
    </div>
  )
}
