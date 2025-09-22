import { createHash } from "crypto"

const DEFAULT_ENCODING = "base64url"

const stripWeakPrefix = (value: string) => value.replace(/^W\//i, "")

const stripQuotes = (value: string) =>
  value.startsWith("\"") && value.endsWith("\"")
    ? value.slice(1, value.length - 1)
    : value

const normaliseTag = (value: string) => stripQuotes(stripWeakPrefix(value.trim()))

export const generateETag = (payload: unknown, opts?: { weak?: boolean }) => {
  const serialised =
    typeof payload === "string" ? payload : JSON.stringify(payload ?? null)

  const hash = createHash("sha256").update(serialised).digest(DEFAULT_ENCODING)
  const tag = `"${hash}"`
  return opts?.weak ? `W/${tag}` : tag
}

export const isIfNoneMatchFresh = (
  headerValue: string | null,
  currentTag: string
) => {
  if (!headerValue) {
    return false
  }

  if (headerValue.trim() === "*") {
    return true
  }

  const expected = normaliseTag(currentTag)
  return headerValue
    .split(",")
    .map((candidate) => normaliseTag(candidate))
    .some((candidate) => candidate === expected)
}
