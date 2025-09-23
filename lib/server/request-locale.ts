import { headers } from "next/headers"

import { normalizeLocale } from "@/lib/user-settings"

export function detectRequestLocale(): string | undefined {
  const headerValue = headers().get("accept-language")

  if (!headerValue) {
    return undefined
  }

  const [primary] = headerValue.split(",")
  if (!primary) {
    return undefined
  }

  const [locale] = primary.split(";")
  return normalizeLocale(locale)
}
