export class OfflineMutationRetryableError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "OfflineMutationRetryableError";
  }
}

export class OfflineMutationConflictError extends Error {
  constructor(message: string, public readonly metadata?: Record<string, unknown>) {
    super(message);
    this.name = "OfflineMutationConflictError";
  }
}
