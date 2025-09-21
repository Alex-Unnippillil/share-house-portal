"use client"

import { useEffect, useMemo, useState } from "react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { TenantMembership } from "@/types/tenant"

const STORAGE_KEY = "share-house-active-tenant"

interface TenantSwitcherProps {
  tenants: TenantMembership[]
  className?: string
  onTenantChange?: (tenant: TenantMembership) => void
}

export function TenantSwitcher({ tenants, className, onTenantChange }: TenantSwitcherProps) {
  const [currentTenantId, setCurrentTenantId] = useState<string | undefined>()

  useEffect(() => {
    if (!tenants.length) return
    const stored = window.localStorage.getItem(STORAGE_KEY)
    const match = tenants.find((tenant) => tenant.id === stored)
    const initial = match ?? tenants[0]
    setCurrentTenantId(initial.id)
    if (!stored) {
      window.localStorage.setItem(STORAGE_KEY, initial.id)
    }
    onTenantChange?.(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenants])

  function handleChange(value: string) {
    const selected = tenants.find((tenant) => tenant.id === value)
    if (!selected) return
    setCurrentTenantId(selected.id)
    window.localStorage.setItem(STORAGE_KEY, selected.id)
    onTenantChange?.(selected)
  }

  const activeTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === currentTenantId),
    [currentTenantId, tenants]
  )

  if (tenants.length < 2) {
    return null
  }

  return (
    <Select onValueChange={handleChange} value={activeTenant?.id}>
      <SelectTrigger className={className ?? "w-[220px]"} aria-label="Select tenant">
        <SelectValue placeholder="Select tenant" />
      </SelectTrigger>
      <SelectContent>
        {tenants.map((tenant) => (
          <SelectItem key={tenant.id} value={tenant.id}>
            <div className="flex flex-col">
              <span className="font-medium">{tenant.name}</span>
              <span className="text-xs text-muted-foreground">
                {tenant.role}
                {tenant.status ? ` • ${tenant.status}` : ""}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
