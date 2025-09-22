import type { PostgrestError } from "@supabase/supabase-js"

type PostgresErrorLike = Pick<PostgrestError, "code" | "message" | "details" | "hint">

type UserFacingError = {
  message: string
  status: number
}

const POSTGRES_ERROR_MAP: Record<string, UserFacingError> = {
  "23P01": {
    message: "This amenity is already booked for the selected time.",
    status: 409,
  },
  "23505": {
    message: "This amenity is already booked for the selected time.",
    status: 409,
  },
}

const DEFAULT_POSTGRES_ERROR: UserFacingError = {
  message: "Unable to process booking request.",
  status: 500,
}

export function mapPostgresError(
  error: PostgresErrorLike | null | undefined,
): UserFacingError {
  if (error?.code) {
    const mapped = POSTGRES_ERROR_MAP[error.code]

    if (mapped) {
      return mapped
    }
  }

  if (error?.message) {
    return { ...DEFAULT_POSTGRES_ERROR, message: error.message }
  }

  return DEFAULT_POSTGRES_ERROR
}
