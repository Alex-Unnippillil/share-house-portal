import { resolveUserSettings } from "@/lib/user-settings"

export function roundToCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

export function parseCurrencyInput(rawValue: string): number {
  if (!rawValue) {
    return Number.NaN
  }

  const normalized = rawValue.replace(/[^0-9.-]/g, "").trim()
  if (!normalized) {
    return Number.NaN
  }

  const parsed = Number.parseFloat(normalized)
  if (!Number.isFinite(parsed)) {
    return Number.NaN
  }

  return roundToCurrency(parsed)
}

export interface FormatCurrencyOptions {
  readonly currency?: string
  readonly locale?: string
  readonly minimumFractionDigits?: number
  readonly maximumFractionDigits?: number
}

export function formatCurrency(amount: number, options?: FormatCurrencyOptions): string {
  const { currency, locale } = resolveUserSettings({
    currency: options?.currency,
    locale: options?.locale,
  })

  const formatOptions: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
  }

  if (options?.minimumFractionDigits != null) {
    formatOptions.minimumFractionDigits = options.minimumFractionDigits
  }

  if (options?.maximumFractionDigits != null) {
    formatOptions.maximumFractionDigits = options.maximumFractionDigits
  }

  try {
    return new Intl.NumberFormat(locale, formatOptions).format(amount)
  } catch (error) {
    const digits =
      options?.maximumFractionDigits ??
      options?.minimumFractionDigits ??
      2
    return `${roundToCurrency(amount).toFixed(digits)} ${currency.toUpperCase()}`
  }
}
