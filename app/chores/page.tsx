import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { ChoreAssignmentsList, type AssignmentWithSwaps } from '@/components/chores/chore-assignments-list'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { Database } from '@/lib/supabase'
import { createClient } from '@/utils/supa-server-actions'

interface RoommateProfile
  extends Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'avatar_url' | 'unit_id'> {}

export default async function ChoresPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, unit_id')
    .eq('id', user.id)
    .single<RoommateProfile>()

  if (!profile) {
    return (
      <div className="container max-w-4xl space-y-6 py-12">
        <header className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Chore assignments</h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              Stay on top of shared responsibilities and coordinate swaps with your roommates.
            </p>
          </div>
          <Separator />
        </header>
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Profile not found</CardTitle>
            <CardDescription>
              We could not load your roommate profile. Please complete onboarding or contact support for help.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!profile.unit_id) {
    return (
      <div className="container max-w-4xl space-y-6 py-12">
        <header className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Chore assignments</h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              Stay on top of shared responsibilities and coordinate swaps with your roommates.
            </p>
          </div>
          <Separator />
        </header>
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Join your household</CardTitle>
            <CardDescription>
              Once a property manager links you to a unit you&apos;ll see your chore schedule and swap requests here.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const { data: roommateRows } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, unit_id')
    .eq('unit_id', profile.unit_id)
    .order('full_name', { ascending: true })
  const roommateMap = new Map<string, RoommateProfile>()
  ;(roommateRows ?? []).forEach((roommate) => {
    roommateMap.set(roommate.id, roommate)
  })
  if (!roommateMap.has(profile.id)) {
    roommateMap.set(profile.id, {
      id: profile.id,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      unit_id: profile.unit_id,
    })
  }
  const roommates = Array.from(roommateMap.values())

  const { data: assignmentsRows } = await supabase
    .from('chore_assignments')
    .select('id, title, description, scheduled_for, status, assigned_to, unit_id, metadata, created_at, updated_at')
    .eq('unit_id', profile.unit_id)
    .order('scheduled_for', { ascending: true })

  const assignmentIds = (assignmentsRows ?? []).map((assignment) => assignment.id)

  const { data: swapsRows } = assignmentIds.length
    ? await supabase
        .from('chore_swaps')
        .select('*')
        .in('assignment_id', assignmentIds)
    : { data: [] as Database['public']['Tables']['chore_swaps']['Row'][] }

  const roommateLookup = new Map(roommates.map((roommate) => [roommate.id, roommate]))
  const assignments: AssignmentWithSwaps[] = (assignmentsRows ?? []).map((assignment) => ({
    ...assignment,
    assignee: roommateLookup.get(assignment.assigned_to) ?? null,
    swaps: (swapsRows ?? []).filter((swap) => swap.assignment_id === assignment.id),
  }))

  return (
    <div className="container max-w-5xl space-y-10 py-12">
      <header className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Chore assignments</h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            See what&apos;s on your plate, propose swaps, and keep everyone in sync without leaving the portal.
          </p>
        </div>
        <Separator />
      </header>
      <ChoreAssignmentsList assignments={assignments} roommates={roommates} currentUserId={profile.id} />
    </div>
  )
}
