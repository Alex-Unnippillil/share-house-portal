export class PackageServiceError extends Error {
  public readonly status: number
  public readonly details?: unknown

  constructor(message: string, status = 500, details?: unknown) {
    super(message)
    this.name = 'PackageServiceError'
    this.status = status
    this.details = details
  }
}

export function assertEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new PackageServiceError(`${name} is not configured`, 500)
  }

  return value
}
