import Link from 'next/link'

import { Button } from '@/components/ui/button'

type SuppliesPageProps = {
  searchParams?: {
    success?: string
    total?: string
    error?: string
  }
}

const decodeParam = (value?: string | null) => {
  if (!value) {
    return null
  }

  try {
    return decodeURIComponent(value)
  } catch (error) {
    console.error('Failed to decode query parameter', error)
    return value
  }
}

export default function SuppliesPage({ searchParams }: SuppliesPageProps) {
  const successParam = searchParams?.success
  const totalParam = searchParams?.total
  const errorMessage = decodeParam(searchParams?.error)

  const totalAmount = totalParam ? Number(totalParam) : undefined
  const hasValidTotal = typeof totalAmount === 'number' && !Number.isNaN(totalAmount)

  const successMessage =
    successParam === '1'
      ? `Purchase logged successfully.${
          hasValidTotal ? ` Total recorded: $${totalAmount.toFixed(2)}.` : ''
        }`
      : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Shared Supplies</h1>
          <p className="text-muted-foreground">
            Track and split costs for cleaning supplies and essentials.
          </p>
        </div>
        <Button asChild>
          <Link href="/supplies/new-purchase">Log a purchase</Link>
        </Button>
      </div>

      {successMessage && (
        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Log what was purchased, how many units, and upload receipts so everyone can see the history.
        Purchases are evenly split between active roommates once submitted.
      </div>
    </div>
  )
}
