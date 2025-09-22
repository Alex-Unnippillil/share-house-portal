"use client"

import { useTransition } from "react"

import { signOut } from "@/app/auth/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AiOutlineLoading3Quarters } from "react-icons/ai"

export default function SignOutButton() {
  const [isPending, startTransition] = useTransition()

  const onSubmit = async () => {
    startTransition(async () => {
      await signOut()
    })
  }

  return (
    <form action={onSubmit}>
      <Button className="flex w-full items-center gap-2" variant="outline">
        Sign out
        <AiOutlineLoading3Quarters
          className={cn("animate-spin", { hidden: !isPending })}
        />
      </Button>
    </form>
  )
}
