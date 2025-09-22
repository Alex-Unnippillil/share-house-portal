import { NextResponse } from 'next/server'
import { z } from 'zod'

import type { Database } from '@/lib/supabase'
import {
  fetchTorontoWasteIcs,
  makeWasteAssignmentKey,
  normalizeTorontoAddress,
  parseTorontoWasteIcs,
} from '@/lib/integrations/toronto-waste'
import { createClient } from '@supabase/supabase-js'

const ingestRequestSchema = z.object({
  address: z.string().min(3, 'An address is required'),
  year: z
    .number({ invalid_type_error: 'Year must be a number' })
    .int()
    .min(2020)
    .max(2100)
    .optional(),
  icsUrl: z.string().url().optional(),
  clearExisting: z.boolean().optional(),
})

type IngestRequest = z.infer<typeof ingestRequestSchema>

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase service credentials are not configured')
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function POST(request: Request) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const parsed = ingestRequestSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const body: IngestRequest = parsed.data
  const supabase = createServiceClient()

  const address = body.address.trim()
  const normalizedAddress = normalizeTorontoAddress(address)

  let sourceUrl: string
  let icsPayload: string
  try {
    const { ics, url } = await fetchTorontoWasteIcs(address, {
      year: body.year,
      overrideUrl: body.icsUrl,
    })
    sourceUrl = url
    icsPayload = ics
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error downloading ICS'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  const parsedEvents = parseTorontoWasteIcs(icsPayload)
  if (!parsedEvents.length) {
    return NextResponse.json(
      {
        message: 'ICS downloaded but no waste collection events were found.',
        sourceUrl,
      },
      { status: 200 }
    )
  }

  const uniqueEvents = Array.from(
    parsedEvents.reduce<Map<string, (typeof parsedEvents)[number]>>((acc, event) => {
      const key = makeWasteAssignmentKey({ date: event.date, summary: event.summary })
      if (!acc.has(key)) {
        acc.set(key, event)
      }
      return acc
    }, new Map())
  ).map(([, event]) => event)

  const sortedEvents = uniqueEvents.sort((a, b) => a.date.localeCompare(b.date))
  const earliestDate = sortedEvents[0]?.date
  const latestDate = sortedEvents[sortedEvents.length - 1]?.date

  const deletions = { count: 0 }
  if (body.clearExisting ?? true) {
    const deleteQuery = supabase
      .from('garbage_events')
      .delete()
      .eq('address_normalized', normalizedAddress)
    if (earliestDate) {
      deleteQuery.gte('event_date', earliestDate)
    }
    if (latestDate) {
      deleteQuery.lte('event_date', latestDate)
    }
    const { data: removed, error: deleteError } = await deleteQuery.select('id')
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }
    deletions.count = removed?.length ?? 0
  }

  const insertPayload = sortedEvents.map(event => ({
    address,
    address_normalized: normalizedAddress,
    event_date: event.date,
    summary: event.summary,
    description: event.description ?? null,
    materials: event.materials,
    source_url: sourceUrl,
    ics_uid: event.uid ?? null,
    ics_dtstart_raw: event.raw.dtstart,
    ics_tzid: event.tzid ?? null,
    all_day: event.allDay,
  }))

  const { data: upserted, error: upsertError } = await supabase
    .from('garbage_events')
    .upsert(insertPayload, {
      onConflict: 'address_normalized,event_date,summary',
    })
    .select('id')

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  return NextResponse.json({
    address,
    normalizedAddress,
    sourceUrl,
    ingested: insertPayload.length,
    upserted: upserted?.length ?? 0,
    deleted: deletions.count,
    span: {
      start: earliestDate,
      end: latestDate,
    },
  })
}
