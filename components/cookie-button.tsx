import { siteConfig } from '@/config/site'
import { Icons } from '@/components/icons'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'


export function CookieButton() {
  return (
    <div className="fixed bottom-0 right-0 z-50">
      <a
        href="#"
        className={cn(
          buttonVariants({
            size: "icon",
            variant: "ghost",
          }),
          "yourConsentManager",
        )}
        aria-label="Open cookie preferences"
      >
        <Icons.cookie className="size-5" aria-hidden="true" />
        <span className="sr-only">Open cookie preferences</span>
      </a>
    </div>
  )
}