export const supportedLocales = [
  "en-US",
  "de-DE",
  "es-ES",
  "fr-FR",
  "ja-JP",
  "ko-KR",
  "zh-CN",
  "pt-PT",
] as const

export type SupportedLocale = (typeof supportedLocales)[number]

export const defaultUserSettings = {
  locale: "en-US" as SupportedLocale,
  currency: "USD",
}

export type DefaultUserSettings = typeof defaultUserSettings
