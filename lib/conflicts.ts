export type OptimisticMetadata = {
  version?: number | null
  updated_at?: string | null
}

export type ConflictDetails<TCurrent, TIncoming> = {
  message: string
  current: TCurrent & OptimisticMetadata
  incoming: TIncoming
  latestVersion: number | null
  latestUpdatedAt: string | null
}

export type ConflictEvaluation<TCurrent, TIncoming> =
  | { hasConflict: false }
  | { hasConflict: true; details: ConflictDetails<TCurrent, TIncoming> }

export function evaluateConflict<TCurrent extends OptimisticMetadata, TIncoming>(
  params: {
    current: TCurrent
    incoming: TIncoming
    expectedVersion?: number | null
    expectedUpdatedAt?: string | null
    message?: string
  }
): ConflictEvaluation<TCurrent, TIncoming> {
  const { current, incoming, expectedVersion, expectedUpdatedAt } = params
  const message =
    params.message ??
    'Someone else changed this record while you were editing. Review the latest version before saving again.'

  const normalizedExpectedUpdatedAt = expectedUpdatedAt
    ? new Date(expectedUpdatedAt).toISOString()
    : null
  const normalizedCurrentUpdatedAt = current.updated_at
    ? new Date(current.updated_at).toISOString()
    : null

  const versionMismatch =
    typeof expectedVersion === 'number' && current.version != null
      ? expectedVersion !== current.version
      : false

  const timestampMismatch = normalizedExpectedUpdatedAt
    ? normalizedCurrentUpdatedAt !== normalizedExpectedUpdatedAt
    : false

  if (!versionMismatch && !timestampMismatch) {
    return { hasConflict: false }
  }

  return {
    hasConflict: true,
    details: {
      message,
      current,
      incoming,
      latestVersion: current.version ?? null,
      latestUpdatedAt: normalizedCurrentUpdatedAt,
    },
  }
}

export function extractChangedFields<T extends Record<string, any>>(
  incoming: Partial<T>,
  base: T
): Record<string, any> {
  const result: Record<string, any> = {}
  for (const key of Object.keys(incoming)) {
    const incomingValue = (incoming as Record<string, any>)[key]
    const baseValue = (base as Record<string, any>)[key]

    if (incomingValue !== undefined && incomingValue !== baseValue) {
      result[key] = incomingValue
    }
  }
  return result
}
