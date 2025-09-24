"use client"

import { Icons } from "@/components/icons"
import { useConsentManager } from "@/components/consent-manager"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function CookieButton() {
  const { openManager } = useConsentManager()

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        type="button"
        onClick={openManager}
        className={cn(buttonVariants({ size: "icon", variant: "ghost" }))}
        aria-label="Cookie preferences"
      >
        <Icons.cookie className="size-5" />
      </button>
    </div>
  )
}
