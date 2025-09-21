"use client"

import { useRouter } from "next/navigation"
import * as React from "react"

import { Input } from "@/components/ui/input"

type SearchProps = {
  buildingName: string
}

export function Search({ buildingName }: SearchProps) {
  const router = useRouter()
  const [value, setValue] = React.useState("")

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!value.trim()) return
    const query = new URLSearchParams({ q: value.trim() })
    router.push(`/dashboard/search?${query.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full md:w-auto">
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        type="search"
        placeholder={`Search ${buildingName}`}
        className="md:w-[180px] lg:w-[320px]"
        aria-label={`Search within ${buildingName}`}
      />
    </form>
  )
}