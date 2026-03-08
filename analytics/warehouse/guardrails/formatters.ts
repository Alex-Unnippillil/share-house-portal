const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const

export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes)) {
    return "0B"
  }

  const absolute = Math.abs(bytes)
  if (absolute < 1024) {
    return `${bytes}B`
  }

  let unitIndex = 0
  let value = absolute

  while (value >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const rounded = value >= 10 ? value.toFixed(0) : value.toFixed(1)
  const prefix = bytes < 0 ? "-" : ""
  return `${prefix}${rounded}${BYTE_UNITS[unitIndex]}`
}

export const formatDuration = (durationMs: number): string => {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return "0ms"
  }

  if (durationMs < 1_000) {
    return `${Math.round(durationMs)}ms`
  }

  const totalSeconds = Math.round(durationMs / 1_000)
  const seconds = totalSeconds % 60
  const totalMinutes = Math.floor(totalSeconds / 60)
  const minutes = totalMinutes % 60
  const hours = Math.floor(totalMinutes / 60)

  const segments: string[] = []

  if (hours) {
    segments.push(`${hours}h`)
  }

  if (minutes) {
    segments.push(`${minutes}m`)
  }

  if (seconds || segments.length === 0) {
    segments.push(`${seconds}s`)
  }

  return segments.join(" ")
}
