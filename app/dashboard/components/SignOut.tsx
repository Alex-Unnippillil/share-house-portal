"use client"

import React, { useTransition } from "react"
import { AiOutlineLoading3Quarters } from "react-icons/ai"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { signOut } from "@/app/auth/actions"

export default function SignOut() {
  const [isPending, startTransition] = useTransition()
  const onSubmit = async () => {
    startTransition(async () => {
      await signOut()
    })
  }

  return (
    <form action={onSubmit}>
      <Button className="flex w-full items-center gap-2" variant="outline">
        SignOut{" "}
        <AiOutlineLoading3Quarters
          className={cn(" animate-spin", { hidden: !isPending })}
        />
      </Button>
    </form>
  )
}
