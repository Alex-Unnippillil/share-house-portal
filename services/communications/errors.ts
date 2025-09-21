import type { PostgrestError } from '@supabase/supabase-js'

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError
}

export function assertCondition(condition: unknown, error: HttpError): asserts condition {
  if (!condition) {
    throw error
  }
}

export function normalizeError(error: unknown): HttpError {
  if (isHttpError(error)) {
    return error
  }

  if (error instanceof Error) {
    return new HttpError(500, error.message)
  }

  return new HttpError(500, 'Unexpected error', error)
}

export function throwIfSupabaseError(
  error: PostgrestError | null,
  message: string,
  status = 500,
) {
  if (!error) {
    return
  }

  throw new HttpError(status, message, {
    code: error.code,
    details: error.details,
    hint: error.hint,
    message: error.message,
  })
}
