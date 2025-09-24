import { z } from "zod"

import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"
import { fetchMemberProfile } from "@/lib/data/members"
import type { AuditLogEntryInput } from "@/lib/audit-logs"

export const IMPERSONATION_COOKIE_NAME = "roomsily-impersonation"

const impersonationSessionSchema = z.object({
  impersonatorId: z.string().min(1),
  impersonatorRole: z.enum([
    "tenant",
    "roommate",
    "property_manager",
    "admin",
    "user",
  ]),
  targetUserId: z.string().min(1),
  targetEmail: z.string().email().nullable(),
  targetName: z.string().min(1).nullable(),
  startedAt: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "Invalid date string",
    }),
})

export type ActiveImpersonationSession = z.infer<typeof impersonationSessionSchema>

export class ImpersonationError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ImpersonationError"
    this.status = status
  }
}

type AuditContext = {
  ipAddress?: string | null
  userAgent?: string | null
}

interface StartImpersonationParams {
  client: TypedSupabaseClient
  impersonatorId: string
  targetUserId: string
  auditContext?: AuditContext
}

interface StopImpersonationParams {
  client: TypedSupabaseClient
  impersonatorId: string
  session: ActiveImpersonationSession
  auditContext?: AuditContext
}

export interface StartImpersonationResult {
  session: ActiveImpersonationSession
  metadataUpdate: Record<string, unknown>
  cookieValue: string
  auditEntry: AuditLogEntryInput
}

export interface StopImpersonationResult {
  metadataUpdate: Record<string, unknown>
  auditEntry: AuditLogEntryInput
  endedAt: string
}

export function encodeImpersonationCookie(
  session: ActiveImpersonationSession
): string {
  const payload = impersonationSessionSchema.parse(session)
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
}

export function decodeImpersonationCookie(
  rawValue: string | undefined | null
): ActiveImpersonationSession | null {
  if (!rawValue) {
    return null
  }

  try {
    const decoded = Buffer.from(rawValue, "base64url").toString("utf8")
    const parsed = JSON.parse(decoded) as unknown
    return impersonationSessionSchema.parse(parsed)
  } catch (error) {
    return null
  }
}

export async function startImpersonationSession({
  client,
  impersonatorId,
  targetUserId,
  auditContext,
}: StartImpersonationParams): Promise<StartImpersonationResult> {
  const impersonatorProfile = await fetchMemberProfile(client, impersonatorId)

  if (!impersonatorProfile || impersonatorProfile.role !== "admin") {
    throw new ImpersonationError("Only administrators can impersonate users.", 403)
  }

  if (impersonatorId === targetUserId) {
    throw new ImpersonationError("You cannot impersonate yourself.", 400)
  }

  const targetProfile = await fetchMemberProfile(client, targetUserId)

  if (!targetProfile) {
    throw new ImpersonationError("The requested user could not be found.", 404)
  }

  const startedAt = new Date().toISOString()

  const session: ActiveImpersonationSession = {
    impersonatorId,
    impersonatorRole: impersonatorProfile.role,
    targetUserId: targetProfile.id,
    targetEmail: targetProfile.email ?? null,
    targetName: targetProfile.full_name ?? null,
    startedAt,
  }

  const metadataUpdate = {
    impersonation: {
      active: true,
      started_at: startedAt,
      target_user_id: session.targetUserId,
      target_email: session.targetEmail,
      target_name: session.targetName,
    },
  }

  const auditEntry: AuditLogEntryInput = {
    action: "impersonation_started",
    actorUserId: impersonatorId,
    actorRole: impersonatorProfile.role,
    targetUserId: session.targetUserId,
    performedUnderImpersonation: true,
    metadata: {
      targetEmail: session.targetEmail,
      targetName: session.targetName,
      startedAt,
      ipAddress: auditContext?.ipAddress ?? null,
      userAgent: auditContext?.userAgent ?? null,
    },
  }

  return {
    session,
    metadataUpdate,
    cookieValue: encodeImpersonationCookie(session),
    auditEntry,
  }
}

export async function stopImpersonationSession({
  client,
  impersonatorId,
  session,
  auditContext,
}: StopImpersonationParams): Promise<StopImpersonationResult> {
  const impersonatorProfile = await fetchMemberProfile(client, impersonatorId)

  if (!impersonatorProfile || impersonatorProfile.role !== "admin") {
    throw new ImpersonationError("Only administrators can stop impersonation.", 403)
  }

  const endedAt = new Date().toISOString()

  const metadataUpdate = {
    impersonation: null,
  }

  const auditEntry: AuditLogEntryInput = {
    action: "impersonation_stopped",
    actorUserId: impersonatorId,
    actorRole: impersonatorProfile.role,
    targetUserId: session.targetUserId,
    performedUnderImpersonation: true,
    metadata: {
      targetEmail: session.targetEmail,
      targetName: session.targetName,
      startedAt: session.startedAt,
      endedAt,
      ipAddress: auditContext?.ipAddress ?? null,
      userAgent: auditContext?.userAgent ?? null,
    },
  }

  return {
    metadataUpdate,
    auditEntry,
    endedAt,
  }
}
