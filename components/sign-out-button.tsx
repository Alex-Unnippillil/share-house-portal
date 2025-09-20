"use client"

import { useFormStatus } from "react-dom"

import { cn } from "@/lib/utils"
import { Button, type ButtonProps } from "@/components/ui/button"
import { signOut } from "@/app/auth/actions"

interface SignOutButtonProps extends ButtonProps {
  formClassName?: string
}

function SubmitButton({ className, children, ...props }: ButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      {...props}
      className={cn("flex items-center gap-2", className)}
      isLoading={pending}
    >
      {children}
    </Button>
  )
}

export function SignOutButton({
  children,
  formClassName,
  ...buttonProps
}: SignOutButtonProps) {
  return (
    <form action={signOut} className={cn("inline-flex", formClassName)}>
      <SubmitButton {...buttonProps}>{children ?? "Sign out"}</SubmitButton>
    </form>
  )
}
