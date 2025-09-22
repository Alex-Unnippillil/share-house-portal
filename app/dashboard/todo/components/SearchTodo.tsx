"use client"

import { Input } from "@/components/ui/input"
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

export default function SearchTodo() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentQuery = searchParams.get("q") ?? ""
  const [value, setValue] = useState(currentQuery)

  useEffect(() => {
    setValue(currentQuery)
  }, [currentQuery])

  const updateQuery = useDebouncedCallback((nextValue: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (nextValue.trim()) {
      params.set("q", nextValue.trim())
    } else {
      params.delete("q")
    }

    const search = params.toString()
    const nextPath = search ? `${pathname}?${search}` : pathname
    router.replace(nextPath, { scroll: false })
  })

  return (
    <Input
      value={value}
      placeholder="search by title,author"
      className="border-zinc-600 focus:border-zinc-600"
      onChange={(event) => {
        const nextValue = event.target.value
        setValue(nextValue)
        updateQuery(nextValue)
      }}
      type="search"
      aria-label="Search to-dos"
    />
  )
}
