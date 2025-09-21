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

export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount)
  } catch (error) {
    return `${roundToCurrency(amount).toFixed(2)} ${currency.toUpperCase()}`
  }
}
