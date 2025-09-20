import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supa-server-actions'
import { getAmenityCatalog } from './actions'
import { AmenityBookingClient } from './booking-client'

export const metadata = {
  title: 'Amenity reservations',
  description: 'Browse community amenities and reserve a time that works for you.',
}

export default async function TenantAmenitiesPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const amenities = await getAmenityCatalog()

  return <AmenityBookingClient amenities={amenities} viewerEmail={user.email} />
}
