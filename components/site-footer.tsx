import SmartLink from "@/components/navigation/SmartLink"
import { siteConfig } from "@/config/site"
import { buttonVariants } from "@/components/ui/button"
import { Icons } from "@/components/icons"

export function SiteFooter() {
  return (
    <footer className="z-40 border-t">
      <div className="container flex flex-col gap-8 py-8 md:flex-row md:py-12">
        <div className="flex-1 space-y-4">
         <SmartLink className="ml-0 flex items-center gap-2" href="/" intent="navigation">
          <Icons.logo className="size-6" />
          <div className="flex flex-col leading-tight">
            <span className="inline-block font-semibold">{siteConfig.name}</span>
            <span className="text-xs font-medium text-muted-foreground">www.roomsily</span>
          </div>
        </SmartLink>
          <p className="text-sm text-muted-foreground">
            Manage rent, roommates, and shared amenities from a single, secure Roomsily HQ.
          </p>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-12 sm:grid-cols-3">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Solutions</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <SmartLink
                  href="/payments"
                  className="text-muted-foreground transition-colors hover:text-primary"
                  intent="navigation"
                >
                  Rent payments
                </SmartLink>
              </li>
              <li>
                <SmartLink
                  href="/documents"
                  className="text-muted-foreground transition-colors hover:text-primary"
                  intent="navigation"
                >
                  Document vault
                </SmartLink>
              </li>
              <li>
                <SmartLink
                  href="/messaging"
                  className="text-muted-foreground transition-colors hover:text-primary"
                  intent="navigation"
                >
                  Roommate messaging
                </SmartLink>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Company</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <SmartLink
                  href="/about"
                  className="text-muted-foreground transition-colors hover:text-primary"
                  intent="navigation"
                >
                  About Us
                </SmartLink>
              </li>
              <li>
                <SmartLink
                  href="/contact"
                  className="text-muted-foreground transition-colors hover:text-primary"
                  intent="navigation"
                >
                  Contact
                </SmartLink>
              </li>
              <li>
                <SmartLink
                  href="/privacy"
                  className="text-muted-foreground transition-colors hover:text-primary"
                  intent="navigation"
                >
                  Privacy Policy
                </SmartLink>
              </li>
              <li>
                <SmartLink
                  href="/terms"
                  className="text-muted-foreground transition-colors hover:text-primary"
                  intent="navigation"
                >
                  Terms of Service
                </SmartLink>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="container border-t py-6">
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Roomsily. All rights reserved.
        </p>
      </div>
    </footer>
  )
}