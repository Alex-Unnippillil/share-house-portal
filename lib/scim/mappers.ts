import {
  SCIM_CORE_USER_SCHEMA,
  SCIM_PATCH_OP_SCHEMA,
  SCIM_TENANT_EXTENSION_SCHEMA,
} from "./constants"
import { ScimError } from "./errors"
import type {
  NormalizedScimUser,
  ProfileRole,
  ProfileRow,
  TenantExtension,
} from "./types"

const ROLE_VALUES: ProfileRole[] = [
  "tenant",
  "roommate",
  "property_manager",
  "admin",
  "user",
  null,
]

export function profileToNormalized(profile: ProfileRow): NormalizedScimUser {
  const metadata =
    (profile.metadata as Record<string, unknown> | null | undefined) ?? {}
  const scimMetadata =
    (metadata["scim"] as Record<string, unknown> | null | undefined) ?? {}

  const active =
    typeof scimMetadata.active === "boolean" ? scimMetadata.active : true
  const externalId =
    typeof scimMetadata.externalId === "string" ? scimMetadata.externalId : null

  const userName =
    profile.username ?? profile.email ?? profile.id ?? "unknown-user"
  const email = profile.email ?? profile.username ?? profile.id ?? userName

  return {
    id: profile.id ?? undefined,
    userName,
    email,
    fullName: profile.full_name ?? null,
    active,
    externalId,
    role: profile.role ?? null,
    metadata: { ...metadata },
  }
}

export function profileToScimUser(
  profile: ProfileRow,
  baseUrl: string
) {
  const normalized = profileToNormalized(profile)

  const schemas = [SCIM_CORE_USER_SCHEMA]
  if (normalized.role) {
    schemas.push(SCIM_TENANT_EXTENSION_SCHEMA)
  }

  const tenantExtension: TenantExtension = {}
  if (normalized.role) {
    tenantExtension.role = normalized.role
  }

  const resource: Record<string, unknown> = {
    schemas,
    id: profile.id,
    userName: normalized.userName,
    name: normalized.fullName
      ? { formatted: normalized.fullName }
      : undefined,
    displayName: normalized.fullName ?? undefined,
    active: normalized.active,
    emails: normalized.email
      ? [
          {
            value: normalized.email,
            primary: true,
            type: "work",
          },
        ]
      : [],
    externalId: normalized.externalId ?? undefined,
    meta: {
      resourceType: "User",
      created: profile.created_at ?? undefined,
      lastModified: profile.updated_at ?? profile.created_at ?? undefined,
      location: `${baseUrl}/${profile.id}`,
    },
  }

  if (normalized.role) {
    resource[SCIM_TENANT_EXTENSION_SCHEMA] = tenantExtension
  }

  return resource
}

export function validateRole(role: unknown): ProfileRole {
  if (role === null) return null
  if (typeof role !== "string") {
    throw new ScimError(400, "Role must be a string", "invalidValue")
  }

  if (!ROLE_VALUES.includes(role as ProfileRole)) {
    throw new ScimError(400, "Role is not supported", "invalidValue")
  }

  return role as ProfileRole
}

function parseEmails(value: unknown) {
  if (!value) return null
  if (typeof value === "string") return value

  if (Array.isArray(value)) {
    for (const item of value) {
      if (item && typeof item === "object" && "value" in item) {
        const emailValue = (item as Record<string, unknown>).value
        if (typeof emailValue === "string" && emailValue.trim()) {
          return emailValue.trim()
        }
      }
    }
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>
    const directValue = record.value
    if (typeof directValue === "string" && directValue.trim()) {
      return directValue.trim()
    }
  }

  return null
}

export function parseScimUserInput(
  payload: unknown,
  {
    existingMetadata,
    existingRole,
  }: {
    existingMetadata?: Record<string, unknown>
    existingRole?: ProfileRole
  } = {}
): NormalizedScimUser {
  if (!payload || typeof payload !== "object") {
    throw new ScimError(400, "Invalid SCIM payload", "invalidSyntax")
  }

  const body = payload as Record<string, unknown>
  const schemas = body.schemas
  if (!Array.isArray(schemas) || !schemas.includes(SCIM_CORE_USER_SCHEMA)) {
    throw new ScimError(400, "Missing User schema", "invalidSyntax")
  }

  const userName = typeof body.userName === "string" ? body.userName.trim() : ""
  const emailFromEmails = parseEmails(body.emails)

  if (!userName && !emailFromEmails) {
    throw new ScimError(400, "userName or emails are required", "invalidValue")
  }

  const finalEmail = emailFromEmails ?? userName
  const finalUserName = userName || finalEmail

  if (!finalUserName) {
    throw new ScimError(400, "userName is required", "invalidValue")
  }

  const name = body.name
  let fullName: string | null = null
  if (name && typeof name === "object" && "formatted" in name) {
    const formatted = (name as Record<string, unknown>).formatted
    if (typeof formatted === "string" && formatted.trim()) {
      fullName = formatted.trim()
    }
  }

  if (!fullName) {
    const displayName = body.displayName
    if (typeof displayName === "string" && displayName.trim()) {
      fullName = displayName.trim()
    }
  }

  const existingScim =
    (existingMetadata?.["scim"] as Record<string, unknown> | undefined) ?? {}
  const existingActive =
    typeof existingScim.active === "boolean" ? existingScim.active : true
  const active =
    typeof body.active === "boolean" ? body.active : existingActive

  const externalId =
    typeof body.externalId === "string" && body.externalId.trim()
      ? body.externalId.trim()
      : null

  let role: ProfileRole =
    existingRole !== undefined ? existingRole : null
  const extension = body[SCIM_TENANT_EXTENSION_SCHEMA]
  if (extension !== undefined) {
    if (extension === null) {
      role = null
    } else if (typeof extension === "object") {
      const roleValue = (extension as Record<string, unknown>).role
      if (roleValue !== undefined) {
        role = validateRole(roleValue)
      }
    } else {
      throw new ScimError(400, "Invalid tenant extension", "invalidValue")
    }
  }

  const metadata = { ...(existingMetadata ?? {}) }

  return {
    userName: finalUserName,
    email: finalEmail,
    fullName,
    active,
    externalId,
    role,
    metadata,
  }
}

export function applyPatchOperations(
  existing: NormalizedScimUser,
  payload: unknown
): NormalizedScimUser {
  if (!payload || typeof payload !== "object") {
    throw new ScimError(400, "Invalid SCIM payload", "invalidSyntax")
  }

  const body = payload as Record<string, unknown>
  const schemas = body.schemas
  if (!Array.isArray(schemas) || !schemas.includes(SCIM_PATCH_OP_SCHEMA)) {
    throw new ScimError(400, "Missing PatchOp schema", "invalidSyntax")
  }

  const operations = body.Operations
  if (!Array.isArray(operations) || operations.length === 0) {
    throw new ScimError(400, "Patch operations are required", "invalidSyntax")
  }

  const next: NormalizedScimUser = {
    ...existing,
    metadata: { ...existing.metadata },
  }

  for (const operation of operations) {
    if (!operation || typeof operation !== "object") {
      throw new ScimError(400, "Invalid patch operation", "invalidSyntax")
    }

    const op = String((operation as Record<string, unknown>).op ?? "").toLowerCase()
    const pathValue = (operation as Record<string, unknown>).path
    const value = (operation as Record<string, unknown>).value

    if (!op || (op !== "replace" && op !== "add" && op !== "remove")) {
      throw new ScimError(400, "Unsupported patch op", "invalidValue")
    }

    const path = typeof pathValue === "string" ? pathValue : undefined

    if (!path) {
      throw new ScimError(400, "Patch path is required", "invalidValue")
    }

    const loweredPath = path.toLowerCase()

    if (loweredPath === "active") {
      if (op === "remove") {
        next.active = true
        continue
      }
      if (typeof value !== "boolean") {
        throw new ScimError(400, "active must be boolean", "invalidValue")
      }
      next.active = value
      continue
    }

    if (loweredPath === "username") {
      if (op === "remove") {
        throw new ScimError(400, "userName cannot be removed", "invalidValue")
      }
      if (typeof value !== "string" || !value.trim()) {
        throw new ScimError(400, "userName must be a string", "invalidValue")
      }
      next.userName = value.trim()
      continue
    }

    if (loweredPath === "externalid") {
      if (op === "remove") {
        next.externalId = null
        continue
      }
      if (typeof value !== "string") {
        throw new ScimError(400, "externalId must be a string", "invalidValue")
      }
      next.externalId = value.trim()
      continue
    }

    if (loweredPath === "name.formatted" || loweredPath === "displayname") {
      if (op === "remove") {
        next.fullName = null
        continue
      }
      if (typeof value !== "string") {
        throw new ScimError(400, "name must be a string", "invalidValue")
      }
      next.fullName = value.trim()
      continue
    }

    if (loweredPath.startsWith("emails")) {
      if (op === "remove") {
        throw new ScimError(400, "emails cannot be removed", "invalidValue")
      }
      const newEmail = parseEmails(value)
      if (!newEmail) {
        throw new ScimError(400, "Invalid email value", "invalidValue")
      }
      next.email = newEmail
      continue
    }

    if (loweredPath === `${SCIM_TENANT_EXTENSION_SCHEMA.toLowerCase()}:role`) {
      if (op === "remove") {
        next.role = null
        continue
      }
      next.role = validateRole(value)
      continue
    }

    throw new ScimError(400, `Unsupported patch path: ${path}`, "invalidPath")
  }

  return next
}
