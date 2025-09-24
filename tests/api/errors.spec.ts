import { describe, expect, it } from "vitest"

import {
  ApiError,
  ERROR_CATALOG,
  ERROR_DOCS_PATH,
  type ErrorCode,
  getErrorDocsUrl,
  jsonError,
  jsonErrorFromUnknown,
  serializeError,
} from "@/lib/errors"

const DEFAULT_FAILURE_MESSAGE = "Unexpected error occurred"

describe("API error utilities", () => {
  it("serialises each error code with the expected docs URL", () => {
    for (const [code, definition] of Object.entries(ERROR_CATALOG)) {
      const error = new ApiError(code as ErrorCode)
      const serialised = serializeError(error)

      expect(serialised).toEqual({
        code: code as ErrorCode,
        message: definition.message,
        docs: getErrorDocsUrl(code as ErrorCode),
      })
    }
  })

  it("preserves custom messages and details", () => {
    const error = new ApiError("REQUEST_VALIDATION_ERROR", {
      message: "Payload was invalid",
      details: { field: "limit", issue: "too_large" },
    })

    expect(serializeError(error)).toEqual({
      code: "REQUEST_VALIDATION_ERROR",
      message: "Payload was invalid",
      docs: `${ERROR_DOCS_PATH}#request_validation_error`,
      details: { field: "limit", issue: "too_large" },
    })
  })

  it("creates HTTP responses using the mapped status codes", async () => {
    const response = jsonError("AUTH_UNAUTHORIZED")
    expect(response.status).toBe(ERROR_CATALOG.AUTH_UNAUTHORIZED.httpStatus)

    const payload = (await response.json()) as {
      error: { code: ErrorCode; message: string; docs: string }
    }

    expect(payload.error.code).toBe("AUTH_UNAUTHORIZED")
    expect(payload.error.docs).toBe(
      `${ERROR_DOCS_PATH}#auth_unauthorized`
    )
  })

  it("normalises unknown errors with fallback codes", async () => {
    const response = jsonErrorFromUnknown(
      new Error(DEFAULT_FAILURE_MESSAGE)
    )

    expect(response.status).toBe(
      ERROR_CATALOG.INTERNAL_SERVER_ERROR.httpStatus
    )

    const payload = (await response.json()) as {
      error: { code: ErrorCode; message: string; docs: string }
    }

    expect(payload.error.code).toBe("INTERNAL_SERVER_ERROR")
    expect(payload.error.message).toBe(DEFAULT_FAILURE_MESSAGE)
  })
})
