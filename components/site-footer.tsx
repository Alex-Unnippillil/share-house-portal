import Link from "next/link"
import { siteConfig } from "@/config/site"
import { buttonVariants } from "@/components/ui/button"
import { Icons } from "@/components/icons"

export function SiteFooter() {
  return (
    <footer className="z-40 border-t">
      <div className="container flex flex-col gap-8 py-8 md:flex-row md:py-12">
        <div className="flex-1 space-y-4">
         <Link className="ml-0 flex items-center gap-1" href="/">
          <Icons.logo className="size-6" />
          <span className="inline-block font-bold">{siteConfig.name}</span>
        </Link>
          <p className="text-sm text-muted-foreground">
            Manage rent, roommates, and shared amenities from a single, secure portal.
          </p>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-12 sm:grid-cols-3">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Solutions</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/payments" className="text-muted-foreground transition-colors hover:text-primary">
                  Rent payments
                </Link>
              </li>
              <li>
                <Link href="/documents" className="text-muted-foreground transition-colors hover:text-primary">
                  Document vault
                </Link>
              </li>
              <li>
                <Link href="/messaging" className="text-muted-foreground transition-colors hover:text-primary">
                  Roommate messaging
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Company</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/about" className="text-muted-foreground transition-colors hover:text-primary">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground transition-colors hover:text-primary">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-muted-foreground transition-colors hover:text-primary">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-muted-foreground transition-colors hover:text-primary">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="container border-t py-6">
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Shared House Portal. All Rights Reserved.
        </p>
      </div>
    </footer>
  )
}