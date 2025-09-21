import { redirect } from 'next/navigation'

import { ScheduleForm } from '@/components/schedule-form'
import { Toaster } from '@/components/ui/toaster'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createSupbaseServerClient, resolveTenantContext, scopeQueryToBuilding } from '@/utils/supaone'

export default async function SchedulePage() {
  const supabase = createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const tenantContext = await resolveTenantContext(supabase, user.id)

  if (!tenantContext.buildingId) {
    return (
      <div className="container mx-auto flex justify-center p-4 pt-10">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Schedule a New Reservation</CardTitle>
            <CardDescription>
              We could not determine your building membership. Contact your property manager.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const { data: amenities } = await scopeQueryToBuilding(
    supabase,
    'amenities',
    tenantContext.buildingId
  )
    .select('id, name, description, amenity_type, requires_approval')
    .eq('is_active', true)
    .order('name', { ascending: true })

  return (
    <div className="container mx-auto flex justify-center p-4 pt-10">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Schedule a New Reservation</CardTitle>
          <CardDescription>
            Reserve shared amenities and automatically generate a Google Meet invite for your roommates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScheduleForm
            userEmail={user.email ?? ''}
            userName={user.user_metadata?.full_name || user.email || ''}
            amenities={amenities ?? []}
          />
        </CardContent>
      </Card>
      <Toaster />
    </div>
  )
}
