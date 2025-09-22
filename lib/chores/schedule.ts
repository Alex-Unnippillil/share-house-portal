import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { addWeeks, startOfDay } from 'date-fns'
import { revalidateTag, unstable_cache } from 'next/cache'
import { RRule } from 'rrule'

import type { Database } from '@/lib/supabase'

const CHORE_SCHEDULE_GLOBAL_TAG = 'chore-schedule:all'
const CHORE_SCHEDULE_UNIT_PREFIX = 'chore-schedule:unit:'
const CHORE_SCHEDULE_REVALIDATE_SECONDS = 60 * 60 // 1 hour cache TTL

type RawChore = Database['public']['Tables']['chores']['Row'] & {
  rrule?: string | null
  start_date?: string | null
}

export interface ChoreOccurrence {
  id: string
  choreId: string
  title: string
  cadence: string
  dueAt: string
  points: number
  rrule: string
}

export interface ChoreSchedule {
  unitId: string
  rangeStart: string
  rangeEnd: string
  generatedAt: string
  occurrences: ChoreOccurrence[]
}

let cachedAdminClient: SupabaseClient<Database> | null = null

function getSupabaseAdminClient(): SupabaseClient<Database> {
  if (cachedAdminClient) {
    return cachedAdminClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be configured to fetch chore schedules.')
  }

  if (!serviceRoleKey && !anonKey) {
    throw new Error('Either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured to fetch chore schedules.')
  }

  const keyToUse = serviceRoleKey ?? anonKey!

  cachedAdminClient = createClient<Database>(supabaseUrl, keyToUse, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return cachedAdminClient
}

function parseRuleSegments(source: string) {
  const segments = source
    .split(/\s*(?:\r\n|\n|\r)\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean)

  let ruleBody = ''
  let dtstart: Date | null = null

  for (const segment of segments) {
    if (/^DTSTART/i.test(segment)) {
      const value = segment.split(':')[1]
      const parsed = value ? parseRRuleDate(value) : null
      if (parsed) {
        dtstart = parsed
      }
    } else if (/^RRULE:/i.test(segment)) {
      ruleBody = segment.replace(/^RRULE:/i, '')
    } else if (segment.includes('=')) {
      // Handle bare RRULE content without prefix
      ruleBody = segment
    }
  }

  if (!ruleBody && segments.length === 1) {
    ruleBody = segments[0]
  }

  return { ruleBody, dtstart }
}

function parseRRuleDate(value: string) {
  const trimmed = value.trim()
  const normalized = normalizeDateValue(trimmed)
  const parsed = new Date(normalized)
  if (!Number.isNaN(parsed.valueOf())) {
    return parsed
  }
  return null
}

function normalizeDateValue(value: string) {
  if (/^\d{8}T\d{6}Z?$/.test(value)) {
    const year = value.slice(0, 4)
    const month = value.slice(4, 6)
    const day = value.slice(6, 8)
    const hour = value.slice(9, 11)
    const minute = value.slice(11, 13)
    const second = value.slice(13, 15)
    const zone = value.endsWith('Z') ? 'Z' : ''
    return `${year}-${month}-${day}T${hour}:${minute}:${second}${zone}`
  }

  if (/^\d{8}$/.test(value)) {
    const year = value.slice(0, 4)
    const month = value.slice(4, 6)
    const day = value.slice(6, 8)
    return `${year}-${month}-${day}`
  }

  return value
}

function resolveChoreRule(raw: RawChore, rangeStart: Date) {
  const cadence = raw.rrule ?? raw.cadence ?? ''
  const sanitized = cadence.trim()

  if (!sanitized) {
    return new RRule({ freq: RRule.WEEKLY, dtstart: rangeStart })
  }

  const { ruleBody, dtstart } = parseRuleSegments(sanitized)
  const resolvedStart = raw.start_date
    ? new Date(raw.start_date)
    : dtstart ?? rangeStart

  if (/FREQ=/i.test(ruleBody)) {
    const parsed = RRule.parseString(ruleBody)
    return new RRule({ ...parsed, dtstart: parsed.dtstart ?? resolvedStart })
  }

  switch (sanitized.toLowerCase()) {
    case 'daily':
      return new RRule({ freq: RRule.DAILY, dtstart: resolvedStart })
    case 'biweekly':
      return new RRule({ freq: RRule.WEEKLY, interval: 2, dtstart: resolvedStart })
    case 'monthly':
      return new RRule({ freq: RRule.MONTHLY, dtstart: resolvedStart })
    case 'one_time':
      return new RRule({ freq: RRule.DAILY, count: 1, dtstart: resolvedStart })
    case 'weekly':
    default:
      return new RRule({ freq: RRule.WEEKLY, dtstart: resolvedStart })
  }
}

function mapOccurrence(chore: RawChore, occurrence: Date, rule: RRule): ChoreOccurrence {
  const isoDue = occurrence.toISOString()

  return {
    id: `${chore.id}:${isoDue}`,
    choreId: chore.id,
    title: chore.title,
    cadence: chore.cadence,
    dueAt: isoDue,
    points: chore.points,
    rrule: rule.toString(),
  }
}

async function fetchAndExpandChores(unitId: string): Promise<ChoreSchedule> {
  const supabase = getSupabaseAdminClient()
  const rangeStart = startOfDay(new Date())
  const rangeEnd = addWeeks(rangeStart, 8)

  const { data, error } = await supabase
    .from('chores')
    .select('id,title,cadence,points,active,household_id')
    .eq('household_id', unitId)

  if (error) {
    throw new Error(`Failed to load chores for unit ${unitId}: ${error.message}`)
  }

  const activeChores = (data as RawChore[] | null)?.filter((chore) => chore.active) ?? []

  const occurrences = activeChores.flatMap((chore) => {
    const rule = resolveChoreRule(chore, rangeStart)
    const expanded = rule.between(rangeStart, rangeEnd, true)
    return expanded.map((occurrence) => mapOccurrence(chore, occurrence, rule))
  })

  occurrences.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())

  return {
    unitId,
    rangeStart: rangeStart.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
    generatedAt: new Date().toISOString(),
    occurrences,
  }
}

function createUnitCache(unitId: string) {
  return unstable_cache(
    () => fetchAndExpandChores(unitId),
    ['chore-schedule', unitId],
    {
      revalidate: CHORE_SCHEDULE_REVALIDATE_SECONDS,
      tags: [CHORE_SCHEDULE_GLOBAL_TAG, `${CHORE_SCHEDULE_UNIT_PREFIX}${unitId}`],
    }
  )
}

export async function getChoreScheduleForUnit(unitId: string) {
  return createUnitCache(unitId)()
}

export function revalidateChoreScheduleForUnit(unitId: string) {
  revalidateTag(`${CHORE_SCHEDULE_UNIT_PREFIX}${unitId}`)
}

export function revalidateAllChoreSchedules() {
  revalidateTag(CHORE_SCHEDULE_GLOBAL_TAG)
}
