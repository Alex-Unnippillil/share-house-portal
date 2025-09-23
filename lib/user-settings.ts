import { defaultUserSettings, type DefaultUserSettings } from "@/config/user-settings"

export type UserSettings = DefaultUserSettings

export type UserSettingsOverrides = Partial<Pick<UserSettings, "locale" | "currency">>

export function resolveUserSettings(overrides?: UserSettingsOverrides): UserSettings {
  return {
    locale: overrides?.locale ?? defaultUserSettings.locale,
    currency: overrides?.currency ?? defaultUserSettings.currency,
  }
}

export function normalizeLocale(locale: string | null | undefined): string | undefined {
  if (!locale) {
    return undefined
  }

  return locale.trim() || undefined
}

export function deriveUserSettingsFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): UserSettingsOverrides {
  if (!metadata) {
    return {}
  }

  const localeValue =
    typeof metadata.locale === "string"
      ? metadata.locale
      : typeof metadata.language === "string"
        ? metadata.language
        : undefined

  const currencyValue =
    typeof metadata.currency === "string"
      ? metadata.currency
      : typeof metadata.preferred_currency === "string"
        ? metadata.preferred_currency
        : undefined

  return {
    locale: normalizeLocale(localeValue),
    currency: currencyValue?.trim() || undefined,
  }
}
