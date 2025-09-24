export class ApplicationError extends Error {
  constructor(message: string, public data: Record<string, any> = {}) {
    super(message)
  }
}

export class UserError extends ApplicationError {}

export interface IntegrationErrorOptions {
  jobId?: string
  cause?: unknown
  queued?: boolean
  timedOut?: boolean
  extra?: Record<string, unknown>
}

export class IntegrationError extends ApplicationError {
  public readonly serviceName: string
  public readonly operationName: string
  public readonly jobId?: string
  public readonly queued: boolean
  public readonly timedOut: boolean

  constructor(
    message: string,
    serviceName: string,
    operationName: string,
    options: IntegrationErrorOptions = {}
  ) {
    super(message, {
      serviceName,
      operationName,
      jobId: options.jobId,
      queued: options.queued ?? false,
      timedOut: options.timedOut ?? false,
      ...options.extra,
    })

    this.name = this.constructor.name
    this.serviceName = serviceName
    this.operationName = operationName
    this.jobId = options.jobId
    this.queued = options.queued ?? false
    this.timedOut = options.timedOut ?? false

    if (options.cause instanceof Error) {
      // Preserve native error cause support when available without breaking
      // environments that do not yet implement it.
      try {
        ;(this as Error).cause = options.cause
      } catch (_err) {
        // noop - assigning cause is best effort only
      }
    }
  }
}

export class IntegrationUnavailableError extends IntegrationError {
  constructor(
    serviceName: string,
    operationName: string,
    message: string,
    options: IntegrationErrorOptions = {}
  ) {
    super(message, serviceName, operationName, options)
  }
}

export class IntegrationTimeoutError extends IntegrationError {
  constructor(
    serviceName: string,
    operationName: string,
    timeoutMs: number,
    options: IntegrationErrorOptions = {}
  ) {
    super(
      `${serviceName} request timed out after ${timeoutMs}ms`,
      serviceName,
      operationName,
      { ...options, timedOut: true }
    )
  }
}