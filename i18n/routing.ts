export const locales = ["en", "es"] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "en"

export const localePrefix = "never"

export const fallbackLocales: Record<Locale, Locale[]> = {
  en: ["en"],
  es: ["en", "es"],
}

export const routing = {
  locales,
  defaultLocale,
  localePrefix,
  fallbackLocales,
}
