export function getReadableTextColor(
  hex: string,
  { light = "#f8fafc", dark = "#0f172a" } = {},
) {
  const sanitized = hex.replace("#", "")

  if (sanitized.length !== 6) {
    return dark
  }

  const r = parseInt(sanitized.slice(0, 2), 16)
  const g = parseInt(sanitized.slice(2, 4), 16)
  const b = parseInt(sanitized.slice(4, 6), 16)

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  return luminance > 0.6 ? dark : light
}
