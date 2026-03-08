import { NextResponse } from "next/server"

import { SCIM_ERROR_SCHEMA } from "./constants"

export class ScimError extends Error {
  status: number
  scimType?: string

  constructor(status: number, message: string, scimType?: string) {
    super(message)
    this.name = "ScimError"
    this.status = status
    this.scimType = scimType
  }
}

export function toScimErrorResponse(error: ScimError) {
  return NextResponse.json(
    {
      schemas: [SCIM_ERROR_SCHEMA],
      detail: error.message,
      status: String(error.status),
      ...(error.scimType ? { scimType: error.scimType } : {}),
    },
    { status: error.status }
  )
}

export function unexpectedScimError(detail?: string) {
  return new ScimError(500, detail ?? "An unexpected error occurred")
}
