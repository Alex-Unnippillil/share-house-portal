import Ajv, { type ErrorObject, type ValidateFunction } from "ajv"
import addFormats from "ajv-formats"

import documentSignedV1 from "@/docs/events/schemas/document-signed.v1.0.0.json"
import maintenanceRequestSubmittedV1 from "@/docs/events/schemas/maintenance-request-submitted.v1.0.0.json"
import rentPaymentRecordedV1 from "@/docs/events/schemas/rent-payment-recorded.v1.0.0.json"
import visitorBookingSubmittedV1 from "@/docs/events/schemas/visitor-booking-submitted.v1.0.0.json"
import type {
  DomainEventEnvelope,
  DomainEventName,
} from "./types"

const ajv = new Ajv({ allErrors: true, strict: false })
addFormats(ajv)

type SchemaMap = {
  [Name in DomainEventName]: Record<string, object>
}

const schemaRegistry: SchemaMap = {
  "visitor.booking.submitted": {
    "1.0.0": visitorBookingSubmittedV1,
  },
  "maintenance.request.submitted": {
    "1.0.0": maintenanceRequestSubmittedV1,
  },
  "rent.payment.recorded": {
    "1.0.0": rentPaymentRecordedV1,
  },
  "document.signed": {
    "1.0.0": documentSignedV1,
  },
}

const validatorCache = new Map<string, ValidateFunction>()

function makeCacheKey(name: DomainEventName, version: string) {
  return `${name}@${version}`
}

function compileValidator(name: DomainEventName, version: string) {
  const cacheKey = makeCacheKey(name, version)
  const existing = validatorCache.get(cacheKey)
  if (existing) {
    return existing
  }

  const schema = schemaRegistry[name]?.[version]
  if (!schema) {
    throw new Error(
      `No JSON schema registered for event "${name}" version "${version}"`
    )
  }

  const validator = ajv.compile(schema)
  validatorCache.set(cacheKey, validator)
  return validator
}

function formatErrors(errors: ErrorObject[] | null | undefined) {
  if (!errors || errors.length === 0) {
    return []
  }

  return errors.map((error) => {
    const path = error.instancePath ? error.instancePath : "<root>"
    return `${path} ${error.message ?? "validation error"}`.trim()
  })
}

export function validateDomainEvent(
  envelope: DomainEventEnvelope
): { valid: true } | { valid: false; errors: string[] } {
  const validator = compileValidator(envelope.event, envelope.version)
  const valid = validator(envelope)
  if (valid) {
    return { valid: true }
  }

  return {
    valid: false,
    errors: formatErrors(validator.errors),
  }
}

export function assertValidDomainEvent<T extends DomainEventEnvelope>(
  envelope: T
): T {
  const result = validateDomainEvent(envelope)
  if (!result.valid) {
    const details = result.errors.join(", ")
    throw new Error(
      `Domain event ${envelope.event}@${envelope.version} failed validation: ${details}`
    )
  }
  return envelope
}

export function getSupportedVersions(name: DomainEventName) {
  return Object.keys(schemaRegistry[name] ?? {}).sort()
}
