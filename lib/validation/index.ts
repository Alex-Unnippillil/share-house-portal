import { z } from "zod"

import { jsonError } from "@/lib/errors"

interface ParseJsonOptions {
  invalidJsonMessage?: string
  validationErrorMessage?: string
}

type ValidationSuccess<T> = { success: true; data: T }
type ValidationFailure = { success: false; error: Response }

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure

export async function parseRequestJson<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema,
  options: ParseJsonOptions = {}
): Promise<ValidationResult<z.infer<TSchema>>> {
  const {
    invalidJsonMessage = "Invalid JSON payload.",
    validationErrorMessage = "Invalid request payload.",
  } = options

  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return {
      success: false,
      error: jsonError("REQUEST_VALIDATION_ERROR", {
        message: invalidJsonMessage,
      }),
    }
  }

  const parsed = schema.safeParse(payload)

  if (!parsed.success) {
    return {
      success: false,
      error: jsonError("REQUEST_VALIDATION_ERROR", {
        message: validationErrorMessage,
        details: parsed.error.flatten(),
      }),
    }
  }

  return { success: true, data: parsed.data }
}
