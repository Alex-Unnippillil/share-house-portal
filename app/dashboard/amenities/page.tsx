import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supa-server-actions'
import { AmenityManagementClient } from './management-client'
import { getAmenityManagementData } from './actions'

export const metadata = {
  title: 'Amenity management',
  description: 'Configure amenities and review reservation requests submitted by tenants.',
}

export default async function DashboardAmenitiesPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  try {
    const amenities = await getAmenityManagementData()
    return <AmenityManagementClient amenities={amenities} />
  } catch (error) {
    console.error('Unable to load amenity management view', error)
    redirect('/dashboard')
  }
}
