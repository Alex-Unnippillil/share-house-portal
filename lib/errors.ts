export const ERROR_DOCS_PATH = "/docs/api/errors.md" as const

export const ERROR_CATALOG = {
  AUTH_UNAUTHORIZED: {
    httpStatus: 401,
    message: "You must be signed in to access this resource.",
  },
  REQUEST_VALIDATION_ERROR: {
    httpStatus: 400,
    message: "The request parameters were invalid.",
  },
  CONFIGURATION_ERROR: {
    httpStatus: 500,
    message: "A required server configuration value is missing or invalid.",
  },
  DATA_FETCH_FAILED: {
    httpStatus: 500,
    message: "The server was unable to complete the data operation.",
  },
  UPSTREAM_SERVICE_ERROR: {
    httpStatus: 502,
    message: "A dependent upstream service returned an error.",
  },
  INTERNAL_SERVER_ERROR: {
    httpStatus: 500,
    message: "An unexpected error occurred while processing the request.",
  },
} as const

export type ErrorCode = keyof typeof ERROR_CATALOG

export interface ApiErrorOptions {
  message?: string
  details?: unknown
  cause?: unknown
  status?: number
}

export interface SerializedApiError {
  code: ErrorCode
  message: string
  docs: string
  details?: unknown
}

export interface OperatorErrorLog {
  code: ErrorCode
  status: number
  message: string
  details?: unknown
  causeName?: string
  causeMessage?: string
}

export function getErrorDocsUrl(code: ErrorCode): string {
  return `${ERROR_DOCS_PATH}#${code.toLowerCase()}`
}

export class ApiError extends Error {
  public readonly code: ErrorCode

  public readonly status: number

  public readonly docs: string

  public readonly details?: unknown

  constructor(code: ErrorCode, options: ApiErrorOptions = {}) {
    const definition = ERROR_CATALOG[code]
    const message = options.message ?? definition.message

    if (options.cause !== undefined) {
      super(message, { cause: options.cause })
    } else {
      super(message)
    }

    this.name = "ApiError"
    this.code = code
    this.status = options.status ?? definition.httpStatus
    this.docs = getErrorDocsUrl(code)

    if (options.details !== undefined) {
      this.details = options.details
    }

    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ConfigurationApiError extends ApiError {
  constructor(variableName: string, cause?: unknown) {
    super("CONFIGURATION_ERROR", {
      message: `Missing or invalid configuration for ${variableName}.`,
      details: { variableName },
      cause,
    })
    this.name = "ConfigurationApiError"
  }
}

interface UpstreamServiceApiErrorOptions extends ApiErrorOptions {
  operation: string
  upstreamStatus?: number
}

export class UpstreamServiceApiError extends ApiError {
  readonly provider: string

  readonly operation: string

  readonly upstreamStatus?: number

  constructor(provider: string, options: UpstreamServiceApiErrorOptions) {
    super("UPSTREAM_SERVICE_ERROR", {
      ...options,
      details: {
        provider,
        operation: options.operation,
        upstreamStatus: options.upstreamStatus,
        ...(typeof options.details === "object" && options.details !== null ? options.details : {}),
      },
    })
    this.name = "UpstreamServiceApiError"
    this.provider = provider
    this.operation = options.operation
    this.upstreamStatus = options.upstreamStatus
  }
}

export class RequestValidationApiError extends ApiError {
  constructor(message: string, details?: unknown) {
    super("REQUEST_VALIDATION_ERROR", { message, details })
    this.name = "RequestValidationApiError"
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

function inferUpstreamFromError(error: Error): ApiError | null {
  if (error.name === "OperationTimeoutError") {
    return new UpstreamServiceApiError("unknown", {
      operation: "unknown",
      message: error.message,
      details: { kind: "timeout" },
      cause: error,
    })
  }

  if (error.name === "CircuitOpenError") {
    return new UpstreamServiceApiError("unknown", {
      operation: "unknown",
      message: error.message,
      details: { kind: "circuit_open" },
      cause: error,
    })
  }

  if (error.name === "UpstreamHttpError") {
    const maybeStatus = (error as Error & { status?: unknown }).status
    return new UpstreamServiceApiError("unknown", {
      operation: "unknown",
      message: error.message,
      upstreamStatus: typeof maybeStatus === "number" ? maybeStatus : undefined,
      details: { kind: "http" },
      cause: error,
    })
  }

  return null
}

export function toApiError(
  error: unknown,
  fallbackCode: ErrorCode = "INTERNAL_SERVER_ERROR"
): ApiError {
  if (error instanceof ApiError) {
    return error
  }

  if (error instanceof Error) {
    const inferredUpstreamError = inferUpstreamFromError(error)
    if (inferredUpstreamError) {
      return inferredUpstreamError
    }

    return new ApiError(fallbackCode, {
      message: error.message,
      cause: error,
    })
  }

  if (typeof error === "string") {
    return new ApiError(fallbackCode, { message: error })
  }

  if (typeof error === "number" || typeof error === "boolean") {
    return new ApiError(fallbackCode, { message: String(error) })
  }

  if (error && typeof error === "object") {
    let details: unknown = null

    try {
      details = JSON.parse(JSON.stringify(error))
    } catch {
      details = { raw: String(error) }
    }

    return new ApiError(fallbackCode, { details })
  }

  return new ApiError(fallbackCode)
}

export function toOperatorErrorLog(error: unknown): OperatorErrorLog {
  const apiError = toApiError(error)
  const cause = apiError.cause instanceof Error ? apiError.cause : undefined

  return {
    code: apiError.code,
    status: apiError.status,
    message: apiError.message,
    details: apiError.details,
    causeName: cause?.name,
    causeMessage: cause?.message,
  }
}

export function serializeError(error: ApiError): SerializedApiError {
  const payload: SerializedApiError = {
    code: error.code,
    message: error.message,
    docs: error.docs,
  }

  if (error.details !== undefined) {
    payload.details = error.details
  }

  return payload
}

export function jsonError(
  code: ErrorCode,
  options: ApiErrorOptions = {}
): Response {
  const apiError = new ApiError(code, options)

  return Response.json(
    { error: serializeError(apiError) },
    { status: apiError.status }
  )
}

export function jsonErrorFromUnknown(
  error: unknown,
  fallbackCode: ErrorCode = "INTERNAL_SERVER_ERROR"
): Response {
  const apiError = toApiError(error, fallbackCode)

  return Response.json(
    { error: serializeError(apiError) },
    { status: apiError.status }
  )
}
