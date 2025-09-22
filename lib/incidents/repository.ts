import type { Incident, IncidentUpdate, IncidentSeverity, IncidentStatus } from "./types"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

export interface CreateIncidentRecord {
  household_id: string
  title: string
  description: string
  severity: IncidentSeverity
  status: IncidentStatus
  assigned_member_id: string | null
  reported_by: string | null
  landlord_notified_at: string | null
  created_at: string
  updated_at: string
}

export interface UpdateIncidentChanges {
  assigned_member_id?: string | null
  description?: string
  severity?: IncidentSeverity
  status?: IncidentStatus
  title?: string
  landlord_notified_at?: string | null
  updated_at: string
}

export interface CreateIncidentUpdateRecord {
  incident_id: string
  message: string
  author_id: string | null
  status: IncidentStatus
  severity: IncidentSeverity
  created_at: string
}

export interface IncidentRepository {
  createIncident(record: CreateIncidentRecord): Promise<Incident>
  getIncidentById(id: string): Promise<Incident | null>
  updateIncident(id: string, changes: UpdateIncidentChanges): Promise<Incident>
  createIncidentUpdate(record: CreateIncidentUpdateRecord): Promise<IncidentUpdate>
}

export class SupabaseIncidentRepository implements IncidentRepository {
  constructor(private readonly client: TypedSupabaseClient) {}

  async createIncident(record: CreateIncidentRecord): Promise<Incident> {
    const payload = this.cleanUndefined(record)
    const { data, error } = await this.client.from("incidents").insert(payload).select().single()

    if (error) {
      throw new Error(`Failed to create incident: ${error.message}`)
    }

    return data
  }

  async getIncidentById(id: string): Promise<Incident | null> {
    const { data, error } = await this.client.from("incidents").select("*").eq("id", id).maybeSingle()

    if (error) {
      throw new Error(`Failed to load incident ${id}: ${error.message}`)
    }

    return data ?? null
  }

  async updateIncident(id: string, changes: UpdateIncidentChanges): Promise<Incident> {
    const payload = this.cleanUndefined(changes)
    const { data, error } = await this.client
      .from("incidents")
      .update(payload)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update incident ${id}: ${error.message}`)
    }

    return data
  }

  async createIncidentUpdate(record: CreateIncidentUpdateRecord): Promise<IncidentUpdate> {
    const payload = {
      ...record,
      author_id: record.author_id ?? null,
    }
    const { data, error } = await this.client
      .from("incident_updates")
      .insert(payload)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to record incident update: ${error.message}`)
    }

    return data
  }

  private cleanUndefined<T extends Record<string, unknown>>(value: T): T {
    return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T
  }
}
