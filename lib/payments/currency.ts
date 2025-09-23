import { formatNumber } from "@/lib/utils"

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

export interface CurrencyFormatOptions extends Intl.NumberFormatOptions {
  locale?: string | null
}

export function formatCurrency(
  amount: number,
  currency: string,
  options?: CurrencyFormatOptions,
): string {
  const { locale, ...overrides } = options ?? {}

  try {
    return formatNumber(amount, {
      locale,
      style: "currency",
      currency,
      ...overrides,
    })
  } catch (error) {
    return `${roundToCurrency(amount).toFixed(2)} ${currency.toUpperCase()}`
  }
}
