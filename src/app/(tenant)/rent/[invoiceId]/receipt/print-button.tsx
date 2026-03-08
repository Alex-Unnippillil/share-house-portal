"use client"

import type { ButtonHTMLAttributes } from "react"
import { Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PrintButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {}

export function PrintButton({ className, children, ...props }: PrintButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => window.print()}
      className={cn("gap-2 print:hidden", className)}
      {...props}
    >
      <Printer className="size-4" aria-hidden="true" />
      <span>{children ?? "Print receipt"}</span>
    </Button>
  )
}
