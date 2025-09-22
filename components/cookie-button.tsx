import { siteConfig } from '@/config/site'
import { Icon } from '@/components/icons'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'
import { cn } from '@/lib/utils'


export function CookieButton() {

return (
<div className="fixed bottom-0 right-0 z-50">

              <div
                className={buttonVariants({
                  size: "icon",
                  variant: "ghost",
                })}
              >

       <a href="#" className={cn("yourConsentManager")}>

                <Icon name="cookie" className="size-5" aria-hidden />
</a>
                <span className="sr-only">Cookie Preferences</span>
              </div>

</div>

 )
}