import { ZodError } from 'zod'

import type { Json } from '@/lib/supabase'

import { PackageServiceError } from './errors'

export function toJsonValue(value: unknown): Json | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => toJsonValue(item))
      .filter((item): item is Json => item !== undefined)
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => {
        const jsonValue = toJsonValue(item)
        return jsonValue === undefined ? null : [key, jsonValue]
      })
      .filter((entry): entry is [string, Json] => entry !== null)

    return Object.fromEntries(entries) as Json
  }

  return undefined
}

export function sanitizeJsonRecord(record: Record<string, unknown>): Record<string, Json> {
  const result: Record<string, Json> = {}

  for (const [key, value] of Object.entries(record)) {
    const jsonValue = toJsonValue(value)
    if (jsonValue !== undefined) {
      result[key] = jsonValue
    }
  }

  return result
}

export function respondWithValidationError(error: ZodError) {
  return Response.json(
    {
      error: 'Validation failed',
      details: error.flatten(),
    },
    { status: 400 }
  )
}

export function respondWithServiceError(error: PackageServiceError) {
  return Response.json(
    {
      error: error.message,
      details: error.details,
    },
    { status: error.status }
  )
}

export function respondWithUnknownError(error: unknown) {
  return Response.json(
    {
      error: 'Unexpected error occurred',
      details: error instanceof Error ? error.message : undefined,
    },
    { status: 500 }
  )
}
