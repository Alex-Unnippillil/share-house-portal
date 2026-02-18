import React from "react"

import { Input } from "@/components/ui/input"

export default function SearchMembers() {
  return (
    <Input
      placeholder="search by role, name"
      className=" bg-white ring-zinc-300 focus:ring-zinc-300 dark:bg-inherit  focus:dark:ring-zinc-700"
    />
  )
}
