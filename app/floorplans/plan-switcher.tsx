"use client"

import { useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type PlanSwitcherOption = {
  id: string
  label: string
}

type PlanSwitcherProps = {
  plans: PlanSwitcherOption[]
  selectedPlanId?: string
}

export function PlanSwitcher({ plans, selectedPlanId }: PlanSwitcherProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const renderedPlans = useMemo(
    () => [...plans].sort((a, b) => a.label.localeCompare(b.label)),
    [plans]
  )

  if (renderedPlans.length === 0) {
    return null
  }

  const handleChange = (value: string) => {
    if (!pathname) {
      return
    }

    const params = new URLSearchParams(searchParams?.toString() ?? "")
    params.set("plan", value)
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <Select value={selectedPlanId} onValueChange={handleChange}>
      <SelectTrigger className="w-[240px]">
        <SelectValue placeholder="Select a floorplan" />
      </SelectTrigger>
      <SelectContent>
        {renderedPlans.map((plan) => (
          <SelectItem key={plan.id} value={plan.id}>
            {plan.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default PlanSwitcher
