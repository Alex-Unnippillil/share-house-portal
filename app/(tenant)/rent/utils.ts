import { format } from 'date-fns'

export function formatCurrency(amount: number, currency?: string) {
  const normalized = (currency ?? 'USD').toUpperCase()
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: normalized,
  }).format(amount)
}

export function formatDate(value?: string | null, fallback: string = '—') {
  if (!value) {
    return fallback
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return fallback
  }

  return format(date, 'PPP')
}
