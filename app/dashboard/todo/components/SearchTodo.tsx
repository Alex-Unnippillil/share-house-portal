import React from "react"

import { Input } from "@/components/ui/input"

export default function SearchTodo() {
  return (
    <Input
      placeholder="search by title,author"
      className=" border-zinc-600  focus:border-zinc-600"
    />
  )
}
