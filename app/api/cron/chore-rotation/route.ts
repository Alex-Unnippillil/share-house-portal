import { addDays, addWeeks, formatISO } from 'date-fns'
import { NextResponse } from 'next/server'

import {
  DEFAULT_CHORE_TEMPLATES,
  computeWeeklyAssignments,
  deriveChoreCatalog,
  normalizeWeekStart,
  type WeeklyAssignmentPlan,
} from '@/lib/chore-scheduler'
import type { Tables } from '@/lib/supabase'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

function isAuthorized(request: Request) {
  const cronHeader = request.headers.get('x-vercel-cron')
  if (cronHeader) {
    return true
  }

  const secret = process.env.CRON_SECRET
  if (!secret) {
    return true
  }

  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${secret}`
}

async function runScheduler(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const targetWeekStart = normalizeWeekStart(addWeeks(new Date(), 1))
  const targetWeekEnd = addDays(targetWeekStart, 6)
  const targetWeekStartISO = formatISO(targetWeekStart, { representation: 'date' })
  const targetWeekEndISO = formatISO(targetWeekEnd, { representation: 'date' })

  type ProfileRow = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'role'>

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, role')
  if (profilesError) {
    return NextResponse.json(
      { error: 'failed_to_load_profiles', details: profilesError.message },
      { status: 500 }
    )
  }

  const roommates: ProfileRow[] = (profiles ?? []).filter((profile) =>
    profile?.role ? ['tenant', 'roommate'].includes(profile.role) : true
  )

  type VacationRow = Pick<Tables<'member_vacations'>, 'profile_id' | 'starts_on' | 'ends_on'>
  const { data: vacations, error: vacationsError } = await supabase
    .from('member_vacations')
    .select('profile_id, starts_on, ends_on')
    .lte('starts_on', targetWeekEndISO)
    .gte('ends_on', targetWeekStartISO)
  if (vacationsError) {
    return NextResponse.json(
      { error: 'failed_to_load_vacations', details: vacationsError.message },
      { status: 500 }
    )
  }

  type AssignmentRow = Pick<
    Tables<'chore_assignments'>,
    'assigned_to' | 'chore_name' | 'week_start' | 'weight' | 'missed_count' | 'completed'
  >
  const { data: historicalAssignments, error: historyError } = await supabase
    .from('chore_assignments')
    .select('assigned_to, chore_name, week_start, weight, missed_count, completed')
    .lt('week_start', targetWeekStartISO)
  if (historyError) {
    return NextResponse.json(
      { error: 'failed_to_load_history', details: historyError.message },
      { status: 500 }
    )
  }

  const choreCatalog = deriveChoreCatalog(
    historicalAssignments ?? [],
    DEFAULT_CHORE_TEMPLATES
  )

  const plan: WeeklyAssignmentPlan = computeWeeklyAssignments({
    weekStart: targetWeekStart,
    roommates,
    vacations: (vacations ?? []) as VacationRow[],
    historicalAssignments: (historicalAssignments ?? []) as AssignmentRow[],
    chores: choreCatalog,
  })

  if (plan.assignments.length === 0) {
    return NextResponse.json(
      {
        message: 'no_assignments_generated',
        weekStart: plan.weekStartISO,
        metadata: plan.metadata,
      },
      { status: 200 }
    )
  }

  const { error: existingDeleteError } = await supabase
    .from('chore_assignments')
    .delete()
    .eq('week_start', plan.weekStartISO)
  if (existingDeleteError) {
    return NextResponse.json(
      { error: 'failed_to_reset_existing_assignments', details: existingDeleteError.message },
      { status: 500 }
    )
  }

  const insertPayload = plan.assignments.map((assignment) => ({
    week_start: plan.weekStartISO,
    chore_name: assignment.chore_name,
    assigned_to: assignment.assigned_to,
    weight: assignment.weight,
    missed_count: assignment.missed_count_snapshot,
    load_before: assignment.load_before,
    fairness_score: assignment.fairness_score,
  }))

  const { data: insertedAssignments, error: insertError } = await supabase
    .from('chore_assignments')
    .insert(insertPayload)
    .select('id, chore_name, assigned_to, weight, missed_count, load_before, fairness_score')
  if (insertError) {
    return NextResponse.json(
      { error: 'failed_to_insert_assignments', details: insertError.message },
      { status: 500 }
    )
  }

  const realtimePayload = {
    generated_at: new Date().toISOString(),
    week_start: plan.weekStartISO,
    assignments: insertedAssignments,
    metadata: plan.metadata,
  }

  const { error: realtimeError } = await supabase.rpc('publish_chore_rotation', {
    assignments: realtimePayload,
  })
  if (realtimeError) {
    return NextResponse.json(
      {
        error: 'failed_to_publish_realtime_update',
        details: realtimeError.message,
        assignments: insertedAssignments,
      },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      weekStart: plan.weekStartISO,
      assignments: insertedAssignments,
      unassigned: plan.unassigned,
      metadata: plan.metadata,
    },
    { status: 200 }
  )
}

export async function GET(request: Request) {
  return runScheduler(request)
}

export async function POST(request: Request) {
  return runScheduler(request)
}
