"use client"

import * as React from "react"
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
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

import { getRoleLabel } from "../lib/access"
import type { BuildingAccess } from "../lib/types"

type PopoverTriggerProps = React.ComponentPropsWithoutRef<typeof PopoverTrigger>

interface TeamSwitcherProps extends PopoverTriggerProps {
  buildings: BuildingAccess[]
  activeBuildingId: string
}

export default function TeamSwitcher({
  className,
  buildings,
  activeBuildingId,
}: TeamSwitcherProps) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeBuilding =
    buildings.find((building) => building.id === activeBuildingId) ?? buildings[0]

  const handleSelect = (building: BuildingAccess) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("building", building.id)
    router.push(`${pathname}?${params.toString()}`)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select a building"
          className={`w-[240px] justify-between ${className ?? ""}`}
        >
          <div className="flex items-center gap-2 text-left">
            <Avatar className="size-6">
              <AvatarImage
                src={`https://avatar.vercel.sh/${activeBuilding?.id ?? "building"}.png`}
                alt={activeBuilding?.name ?? "Building"}
                className="grayscale"
              />
              <AvatarFallback>BL</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="truncate text-sm font-semibold">
                {activeBuilding?.name ?? "Select building"}
              </span>
              {activeBuilding && (
                <span className="text-xs text-muted-foreground">
                  {getRoleLabel(activeBuilding.role)}
                </span>
              )}
            </div>
          </div>
          <CaretSortIcon className="ml-auto size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0">
        <Command>
          <CommandInput placeholder="Search building..." />
          <CommandList>
            <CommandEmpty>No building found.</CommandEmpty>
            <CommandGroup>
              {buildings.map((building) => (
                <CommandItem
                  key={building.id}
                  onSelect={() => handleSelect(building)}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex flex-col">
                    <span className="font-medium">{building.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {getRoleLabel(building.role)}
                    </span>
                  </span>
                  <CheckIcon
                    className={
                      building.id === activeBuilding?.id
                        ? "size-4 opacity-100"
                        : "size-4 opacity-0"
                    }
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