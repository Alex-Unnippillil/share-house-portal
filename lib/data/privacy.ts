import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"
import type { Database } from "@/lib/supabase"

export type PrivacyRequest = Database["public"]["Tables"]["privacy_requests"]["Row"]
export type PrivacyRequestEvent = Database["public"]["Tables"]["privacy_request_events"]["Row"]

type SupabaseLike = Pick<TypedSupabaseClient, "from">

interface PrivacyRequestOptions {
  limit?: number
  status?: PrivacyRequest["status"][]
}

interface PrivacySummary {
  total: number
  byStatus: Record<PrivacyRequest["status"], number>
  pending: number
  completed: number
  failed: number
  byType: Record<PrivacyRequest["request_type"], number>
}

export async function getPrivacyRequests(
  client: SupabaseLike,
  options: PrivacyRequestOptions = {},
): Promise<PrivacyRequest[]> {
  let query = client
    .from("privacy_requests")
    .select(
      `
      id,
      tenant_id,
      requester_email,
      request_type,
      status,
      requested_at,
      completed_at,
      failure_reason,
      export_location,
      processed_by,
      metadata,
      updated_at
    `,
    )
    .order("requested_at", { ascending: false })

  if (options.status?.length) {
    query = query.in("status", options.status)
  }

  if (options.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Unable to load privacy requests: ${error.message}`)
  }

  return (data as PrivacyRequest[] | null | undefined) ?? []
}

export async function getPrivacyRequestEvents(
  client: SupabaseLike,
  requestIds?: string[],
): Promise<PrivacyRequestEvent[]> {
  let query = client
    .from("privacy_request_events")
    .select(
      `
      id,
      request_id,
      status,
      detail,
      actor,
      created_at
    `,
    )
    .order("created_at", { ascending: true })

  if (requestIds?.length) {
    query = query.in("request_id", requestIds)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Unable to load privacy request events: ${error.message}`)
  }

  return (data as PrivacyRequestEvent[] | null | undefined) ?? []
}

export function summarisePrivacyRequests(
  requests: PrivacyRequest[],
): PrivacySummary {
  const initialStatus: Record<PrivacyRequest["status"], number> = {
    received: 0,
    in_progress: 0,
    completed: 0,
    failed: 0,
  }

  const statusCounts = requests.reduce((acc, request) => {
    acc[request.status] = (acc[request.status] ?? 0) + 1
    return acc
  }, { ...initialStatus })

  const typeCounts = requests.reduce(
    (acc, request) => {
      acc[request.request_type] = (acc[request.request_type] ?? 0) + 1
      return acc
    },
    { export: 0, erasure: 0 } as Record<PrivacyRequest["request_type"], number>,
  )

  return {
    total: requests.length,
    byStatus: statusCounts,
    pending: statusCounts.received + statusCounts.in_progress,
    completed: statusCounts.completed,
    failed: statusCounts.failed,
    byType: typeCounts,
  }
}

export function groupEventsByRequest(
  events: PrivacyRequestEvent[],
): Record<string, PrivacyRequestEvent[]> {
  return events.reduce<Record<string, PrivacyRequestEvent[]>>((acc, event) => {
    if (!acc[event.request_id]) {
      acc[event.request_id] = []
    }
    acc[event.request_id].push(event)
    return acc
  }, {})
}
