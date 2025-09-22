import { Icons } from "@/components/icons"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function CookieButton() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <a
        href="#"
        className={cn(
          "yourConsentManager",
          buttonVariants({ size: "icon", variant: "ghost" }),
          "rounded-full border border-border bg-background/80 backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        )}
        aria-label="Open cookie preferences dialog"
      >
        <Icons.cookie className="size-5" aria-hidden="true" />
        <span className="sr-only">Open cookie preferences dialog</span>
      </a>
    </div>
  )
}
