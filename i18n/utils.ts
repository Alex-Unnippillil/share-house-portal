export type Messages = Record<string, unknown>

function isPlainObject(value: unknown): value is Messages {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function mergeMessages(base: Messages, override: Messages): Messages {
  const result: Messages = { ...base }

  for (const [key, value] of Object.entries(override)) {
    if (isPlainObject(value)) {
      const existing = result[key]
      result[key] = mergeMessages(
        isPlainObject(existing) ? existing : {},
        value,
      )
    } else {
      result[key] = value
    }
  }

  return result
}

export function flattenMessages(messages: Messages, prefix = ""): Record<string, string> {
  const entries: Record<string, string> = {}

  for (const [key, value] of Object.entries(messages)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (isPlainObject(value)) {
      Object.assign(entries, flattenMessages(value, fullKey))
    } else {
      entries[fullKey] = String(value)
    }
  }

  return entries
}
