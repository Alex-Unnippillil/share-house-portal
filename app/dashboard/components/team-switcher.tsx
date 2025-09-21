"use client"

import * as React from "react"
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import type { BuildingSummary } from "../lib/data-sources"

type TeamSwitcherProps = React.ComponentPropsWithoutRef<typeof PopoverTrigger> & {
  buildings: BuildingSummary[]
  selectedBuildingId: string
  role: string | null
}

export default function TeamSwitcher({
  className,
  buildings,
  selectedBuildingId,
  role,
  ...props
}: TeamSwitcherProps) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selectedBuilding =
    buildings.find((building) => building.id === selectedBuildingId) ?? buildings[0]

  const handleSelect = (buildingId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("building", buildingId)
    router.push(`${pathname}?${params.toString()}`)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild {...props}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select building"
          className={cn("w-[240px] justify-between", className)}
        >
          <div className="flex flex-col items-start text-left">
            <span className="text-sm font-medium leading-tight">{selectedBuilding?.name}</span>
            <span className="text-xs text-muted-foreground">
              Role: {(role ?? "").replace(/_/g, " ") || "—"}
            </span>
          </div>
          <CaretSortIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Search building..." />
          <CommandEmpty>No building found.</CommandEmpty>
          <CommandList>
            <CommandGroup heading="Buildings">
              {buildings.map((building) => (
                <CommandItem
                  key={building.id}
                  onSelect={() => handleSelect(building.id)}
                  className="text-sm"
                >
                  <span>{building.name}</span>
                  <CheckIcon
                    className={cn(
                      "ml-auto size-4",
                      selectedBuilding?.id === building.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}