import crypto from "node:crypto"

import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase"

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const DEFAULT_CODE_LENGTH = 8
const MAX_CODE_ATTEMPTS = 8

export type VisitorRequestRow =
  Database["public"]["Tables"]["visitor_requests"]["Row"]

type VisitorAccessAuditInsert =
  Database["public"]["Tables"]["visitor_access_audit"]["Insert"]

type VisitorRequestStatus =
  Database["public"]["Enums"]["visitor_request_status"]

export class VisitorAccessControlService {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async mintAccessCode(
    request: VisitorRequestRow,
    options: {
      actorProfileId?: string | null
      approvalNotes?: string | null
      expiresAt?: string | null
    } = {}
  ) {
    if (request.status !== "pending") {
      throw new Error("Visitor request must be pending before minting an access code")
    }

    const accessCode = await this.generateUniqueCode()
    const issuedAt = new Date().toISOString()
    const expiresAt = options.expiresAt ?? request.access_code_expires_at ?? request.visit_end

    const updatePayload: Partial<VisitorRequestRow> = {
      status: "approved" satisfies VisitorRequestStatus,
      approval_notes: options.approvalNotes ?? request.approval_notes,
      approved_at: issuedAt,
      approved_by: options.actorProfileId ?? request.approved_by,
      access_code: accessCode,
      access_code_issued_at: issuedAt,
      access_code_expires_at: expiresAt,
      revoked_at: null,
      revocation_reason: null,
      updated_at: issuedAt,
    }

    const { data, error } = await this.client
      .from("visitor_requests")
      .update(updatePayload)
      .eq("id", request.id)
      .select()
      .single()

    if (error || !data) {
      throw error ?? new Error("Unable to update visitor request with access code")
    }

    await this.logEvent({
      building_id: request.building_id,
      visitor_request_id: request.id,
      event: "code_issued",
      status: "granted",
      metadata: {
        accessCode,
        expiresAt,
      },
      actor_profile_id: options.actorProfileId ?? null,
    })

    await this.scheduleRevocation(data, {
      actorProfileId: options.actorProfileId ?? null,
      revokeAt: expiresAt,
    })

    return {
      accessCode,
      issuedAt,
      expiresAt,
      request: data,
    }
  }

  async scheduleRevocation(
    request: VisitorRequestRow,
    options: { actorProfileId?: string | null; revokeAt?: string | null } = {}
  ) {
    const revokeAt = options.revokeAt ?? request.access_code_expires_at ?? request.visit_end

    await this.logEvent({
      building_id: request.building_id,
      visitor_request_id: request.id,
      event: "revocation_scheduled",
      status: "scheduled",
      metadata: {
        revokeAt,
      },
      actor_profile_id: options.actorProfileId ?? null,
    })

    return revokeAt
  }

  async revokeRequest(
    request: VisitorRequestRow,
    options: { actorProfileId?: string | null; reason?: string | null } = {}
  ) {
    const revokedAt = new Date().toISOString()
    const updatePayload: Partial<VisitorRequestRow> = {
      status: "revoked" satisfies VisitorRequestStatus,
      revoked_at: revokedAt,
      revocation_reason: options.reason ?? request.revocation_reason,
      updated_at: revokedAt,
    }

    const { error } = await this.client
      .from("visitor_requests")
      .update(updatePayload)
      .eq("id", request.id)

    if (error) {
      await this.logEvent({
        building_id: request.building_id,
        visitor_request_id: request.id,
        event: "revoked",
        status: "failed",
        metadata: {
          reason: options.reason ?? null,
          error: error.message,
        },
        actor_profile_id: options.actorProfileId ?? null,
      })

      throw error
    }

    await this.logEvent({
      building_id: request.building_id,
      visitor_request_id: request.id,
      event: "revoked",
      status: "completed",
      metadata: {
        reason: options.reason ?? null,
        revokedAt,
      },
      actor_profile_id: options.actorProfileId ?? null,
    })

    return revokedAt
  }

  private async logEvent(entry: VisitorAccessAuditInsert) {
    const { error } = await this.client.from("visitor_access_audit").insert(entry)

    if (error) {
      throw new Error(`Failed to write visitor access audit event: ${error.message}`)
    }
  }

  private async generateUniqueCode(length = DEFAULT_CODE_LENGTH): Promise<string> {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
      const candidate = this.generateCode(length)
      const { data, error } = await this.client
        .from("visitor_requests")
        .select("id")
        .eq("access_code", candidate)
        .maybeSingle()

      if (error) {
        throw error
      }

      if (!data) {
        return candidate
      }
    }

    throw new Error("Unable to generate a unique visitor access code")
  }

  private generateCode(length = DEFAULT_CODE_LENGTH) {
    const bytes = crypto.randomBytes(length)
    let result = ""

    for (let i = 0; i < length; i += 1) {
      result += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
    }

    return result
  }
}

export async function fetchVisitorRequest(
  client: SupabaseClient<Database>,
  requestId: string
): Promise<VisitorRequestRow | null> {
  const { data, error } = await client
    .from("visitor_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ?? null
}

export async function listRequestsPendingRevocation(
  client: SupabaseClient<Database>,
  before: string
) {
  const { data, error } = await client
    .from("visitor_requests")
    .select("*")
    .eq("status", "approved" satisfies VisitorRequestStatus)
    .is("revoked_at", null)
    .lte("access_code_expires_at", before)

  if (error) {
    throw error
  }

  return data ?? []
}

export function isRevocationEligible(request: VisitorRequestRow, nowIso = new Date().toISOString()) {
  if (request.status !== "approved") {
    return false
  }

  if (request.revoked_at) {
    return false
  }

  const expiresAt = request.access_code_expires_at ?? request.visit_end

  return expiresAt <= nowIso
}
