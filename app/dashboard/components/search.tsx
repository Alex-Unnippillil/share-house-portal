"use client"

import { Input } from "@/components/ui/input"

type SearchProps = {
  buildingName?: string
}

export function Search({ buildingName }: SearchProps) {
  const placeholder = buildingName
    ? `Search ${buildingName} records`
    : "Search building records"

  return (
    <div>
      <Input
        type="search"
        placeholder={placeholder}
        aria-label="Search within building"
        className="md:w-[180px] lg:w-[320px]"
      />
    </div>
  )
}