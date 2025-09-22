'use client'

import { useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Download, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface MonthOption {
  label: string
  value: string
}

interface LedgerFiltersProps {
  months: MonthOption[]
  selectedMonth?: string
}

export function LedgerFilters({ months, selectedMonth }: LedgerFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleMonthChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())

      if (value === 'all') {
        params.delete('month')
      } else {
        params.set('month', value)
      }

      const queryString = params.toString()
      router.push(queryString ? `?${queryString}` : '?', { scroll: false })
    },
    [router, searchParams]
  )

  const exportHref = selectedMonth
    ? `/supplies/ledger/export?month=${selectedMonth}`
    : '/supplies/ledger/export'

  const currentValue = selectedMonth ?? 'all'

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={currentValue} onValueChange={handleMonthChange}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All months</SelectItem>
            {months.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => handleMonthChange('all')}
          disabled={currentValue === 'all'}
        >
          <RotateCcw className="mr-2 size-4" />
          Reset
        </Button>
      </div>
      <Button asChild variant="secondary">
        <a href={exportHref}>
          <Download className="mr-2 size-4" />
          Export CSV
        </a>
      </Button>
    </div>
  )
}
