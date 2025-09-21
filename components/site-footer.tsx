import Link from "next/link"
import { siteConfig } from "@/config/site"
import { Icons } from "@/components/icons"

export function SiteFooter() {
  return (
    <footer className="z-40 border-t">
      <div className="container flex flex-col gap-8 py-8 md:flex-row md:py-12">
        <div className="flex-1 space-y-4">
         <Link className="ml-0 flex items-center gap-1" href={siteConfig.links.portal}>
          <Icons.logo className="size-6" />
          <span className="inline-block font-bold">{siteConfig.name}</span>
        </Link>
          <p className="text-sm text-muted-foreground">
            The central hub for residents to coordinate rent, amenities, maintenance, and community life in the shared house.
          </p>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-12 sm:grid-cols-3">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Residents</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href={siteConfig.links.payments}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  Rent Payments
                </Link>
              </li>
              <li>
                <Link
                  href={siteConfig.links.documents}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  Documents
                </Link>
              </li>
              <li>
                <Link
                  href={siteConfig.links.amenities}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  Amenities
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Community</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href={siteConfig.links.messageBoard}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  Message Board
                </Link>
              </li>
              <li>
                <Link href="/schedule" className="text-muted-foreground transition-colors hover:text-primary">
                  Events Calendar
                </Link>
              </li>
              <li>
                <Link
                  href={siteConfig.links.support}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  Maintenance Requests
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Management</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href={siteConfig.links.leases}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  Lease Library
                </Link>
              </li>
              <li>
                <Link
                  href={siteConfig.links.admin}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  Admin Portal
                </Link>
              </li>
              <li>
                <Link
                  href={siteConfig.links.support}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  Support
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="container border-t py-6">
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}