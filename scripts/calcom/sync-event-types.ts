import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase'

type Amenity = Database['public']['Tables']['amenities']['Row']

type CalComEventType = {
  id: number
  slug: string
  title: string
  description?: string | null
  length?: number | null
  metadata?: Record<string, unknown> | null
}

const DEFAULT_EVENT_LENGTH = Number(process.env.CALCOM_DEFAULT_EVENT_LENGTH ?? 60)
const CALCOM_API_KEY = process.env.CALCOM_API_KEY
const CALCOM_BASE_URL = process.env.CALCOM_BASE_URL ?? 'https://api.cal.com/v1/'

if (!CALCOM_API_KEY) {
  throw new Error('CALCOM_API_KEY environment variable is required')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Supabase service role credentials are required to run the sync script')
}

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

async function calComRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const url = new URL(path, CALCOM_BASE_URL.endsWith('/') ? CALCOM_BASE_URL : `${CALCOM_BASE_URL}/`)
  url.searchParams.set('apiKey', CALCOM_API_KEY)

  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Cal.com request to ${url.pathname} failed with ${response.status}: ${errorBody}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  if (!text) {
    return undefined as T
  }

  try {
    return JSON.parse(text) as T
  } catch (error) {
    throw new Error(`Unable to parse Cal.com response for ${url.pathname}: ${String(error)}`)
  }
}

async function listEventTypes(): Promise<CalComEventType[]> {
  const payload = await calComRequest<CalComEventType[] | { data: CalComEventType[] }>('/event-types')

  if (Array.isArray(payload)) {
    return payload
  }

  if ('data' in payload && Array.isArray(payload.data)) {
    return payload.data
  }

  return []
}

async function createEventType(amenity: Amenity): Promise<CalComEventType> {
  const body = {
    title: amenity.name,
    slug: amenity.slug,
    description: amenity.description ?? undefined,
    length: DEFAULT_EVENT_LENGTH,
    hidden: false,
    disableGuests: true,
  }

  const payload = await calComRequest<CalComEventType | { data: CalComEventType }>(
    '/event-types',
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )

  if ('data' in (payload as { data?: CalComEventType })) {
    return (payload as { data: CalComEventType }).data
  }

  return payload as CalComEventType
}

async function updateEventType(
  currentEventType: CalComEventType,
  amenity: Amenity,
): Promise<CalComEventType> {
  const body = {
    title: amenity.name,
    description: amenity.description ?? undefined,
    length: DEFAULT_EVENT_LENGTH,
    hidden: false,
    disableGuests: true,
  }

  const payload = await calComRequest<CalComEventType | { data: CalComEventType }>(
    `/event-types/${currentEventType.id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  )

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: CalComEventType }).data
  }

  if (payload && typeof payload === 'object' && 'id' in payload) {
    return payload as CalComEventType
  }

  return {
    ...currentEventType,
    title: amenity.name,
    description: amenity.description ?? currentEventType.description,
    length: DEFAULT_EVENT_LENGTH,
  }
}

async function syncAmenity(amenity: Amenity, eventTypesBySlug: Map<string, CalComEventType>): Promise<void> {
  let eventType: CalComEventType | null = null

  if (amenity.calcom_event_type_id) {
    eventType = eventTypesBySlug.get(String(amenity.calcom_event_type_id)) ?? null
  }

  if (!eventType) {
    eventType = eventTypesBySlug.get(amenity.slug) ?? null
  }

  if (!eventType) {
    eventType = await createEventType(amenity)
    console.log(`Created Cal.com event type ${eventType.id} for amenity ${amenity.name}`)
  } else {
    const previousSlug = eventType.slug
    eventType = await updateEventType(eventType, amenity)
    console.log(`Updated Cal.com event type ${eventType.id} for amenity ${amenity.name}`)
    if (previousSlug && previousSlug !== eventType.slug) {
      eventTypesBySlug.delete(previousSlug)
    }
  }

  const slugKeys = new Set<string>([amenity.slug])
  if (eventType.slug) {
    slugKeys.add(eventType.slug)
  }
  for (const slug of slugKeys) {
    eventTypesBySlug.set(slug, eventType)
  }
  eventTypesBySlug.set(String(eventType.id), eventType)

  const { error } = await supabase
    .from('amenities')
    .update({
      calcom_event_type_id: eventType.id,
      calcom_event_type_slug: eventType.slug,
      updated_at: new Date().toISOString(),
    })
    .eq('id', amenity.id)

  if (error) {
    throw new Error(`Failed to persist Cal.com event type for amenity ${amenity.name}: ${error.message}`)
  }
}

async function main() {
  const { data: amenities, error } = await supabase
    .from('amenities')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Unable to read amenities from Supabase: ${error.message}`)
  }

  if (!amenities || amenities.length === 0) {
    console.log('No amenities found to sync.')
    return
  }

  const eventTypes = await listEventTypes()
  const eventTypesBySlug = new Map<string, CalComEventType>()

  for (const eventType of eventTypes) {
    if (eventType.slug) {
      eventTypesBySlug.set(eventType.slug, eventType)
    }
    eventTypesBySlug.set(String(eventType.id), eventType)
  }

  for (const amenity of amenities) {
    await syncAmenity(amenity, eventTypesBySlug)
  }

  console.log('Cal.com event type sync complete.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
