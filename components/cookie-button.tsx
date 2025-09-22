import { siteConfig } from '@/config/site'
import { Icons } from '@/components/icons'
import { buttonVariants } from '@/components/ui/button'
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

                <Icons.cookie className="size-5" />
</a>
                <span className="sr-only">Cookie Preferences</span>
              </div>

</div>

 )
}