import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { addDays, format, startOfWeek } from 'date-fns'

import { getChoreScheduleForUnit, type ChoreOccurrence } from '@/lib/chores/schedule'
import { createClient } from '@/utils/supa-server-actions'

type OccurrenceWithDate = ChoreOccurrence & { dueDate: Date }

export default async function ChoresPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('unit_id, full_name')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('Failed to load profile for chores page', profileError)
  }

  if (!profile?.unit_id) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Chores</h1>
        <p className="text-muted-foreground">
          We do not have a unit assignment on file yet. Once you join a unit you will see the shared chores schedule here.
        </p>
      </div>
    )
  }

  const schedule = await getChoreScheduleForUnit(profile.unit_id)

  const grouped = schedule.occurrences.reduce<Map<string, OccurrenceWithDate[]>>((map, occurrence) => {
    const dueDate = new Date(occurrence.dueAt)
    const weekStart = startOfWeek(dueDate, { weekStartsOn: 1 })
    const key = weekStart.toISOString()
    const current = map.get(key) ?? []
    current.push({ ...occurrence, dueDate })
    map.set(key, current)
    return map
  }, new Map())

  const sortedWeeks = Array.from(grouped.entries()).sort(
    ([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
  )

  const rangeStart = new Date(schedule.rangeStart)
  const rangeEnd = new Date(schedule.rangeEnd)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Chores</h1>
        <p className="text-muted-foreground">
          Upcoming shared chores for the next eight weeks. Assignments update automatically as definitions change.
        </p>
        <div className="rounded-lg border bg-muted/40 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Showing chores from <span className="font-medium text-foreground">{format(rangeStart, 'MMM d')}</span> to{' '}
            <span className="font-medium text-foreground">{format(rangeEnd, 'MMM d')}</span>.{` `}
            {schedule.occurrences.length > 0
              ? `${schedule.occurrences.length} assignment${schedule.occurrences.length === 1 ? '' : 's'} queued.`
              : 'No assignments detected in this window.'}
          </p>
          <p className="text-xs text-muted-foreground">Cached at {format(new Date(schedule.generatedAt), 'MMM d, h:mm a')}.</p>
        </div>
      </div>

      {sortedWeeks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No chores are scheduled for this unit in the next eight weeks. Add or enable chores to populate the rotation.
        </div>
      ) : (
        <div className="space-y-4">
          {sortedWeeks.map(([weekKey, occurrences]) => {
            const weekStart = new Date(weekKey)
            const weekEnd = addDays(weekStart, 6)
            const weeklyPoints = occurrences.reduce((total, occ) => total + occ.points, 0)

            const sortedOccurrences = [...occurrences].sort(
              (a, b) => a.dueDate.getTime() - b.dueDate.getTime()
            )

            return (
              <section key={weekKey} className="overflow-hidden rounded-lg border bg-card">
                <div className="border-b bg-muted/30 px-4 py-3">
                  <h2 className="text-lg font-semibold">
                    Week of {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d')}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {sortedOccurrences.length} chore{sortedOccurrences.length === 1 ? '' : 's'} • {weeklyPoints} points
                  </p>
                </div>
                <ul className="divide-y">
                  {sortedOccurrences.map((occurrence) => (
                    <li key={occurrence.id} className="flex items-center justify-between px-4 py-3">
                      <div className="space-y-1">
                        <p className="font-medium leading-none">{occurrence.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Due {format(occurrence.dueDate, 'EEEE, MMM d')}
                        </p>
                      </div>
                      <div className="text-sm font-medium text-muted-foreground">{occurrence.points} pts</div>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}


