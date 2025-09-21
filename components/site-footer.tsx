import Link from "next/link"

import { siteConfig } from "@/config/site"
import { buttonVariants } from "@/components/ui/button"
import { Icons } from "@/components/icons"

export function SiteFooter() {
  return (
    <footer className="z-40 border-t bg-background/95 backdrop-blur">
      <div className="container flex flex-col gap-10 py-10 md:flex-row md:items-start md:justify-between md:py-14">
        <div className="flex-1 space-y-4">
          <Link className="ml-0 flex items-center gap-2" href="/">
            <Icons.logo className="size-6" />
            <span className="inline-block font-semibold">{siteConfig.name}</span>
          </Link>
          <p className="max-w-sm text-sm text-muted-foreground">
            Share House Portal unifies rent, amenities, visitor policies, and roommate collaboration so every shared property operates smoothly.
          </p>
          <div className="flex gap-3">
            <Link
              href={siteConfig.links.login}
              className={buttonVariants({ size: "sm" })}
            >
              Tenant login
            </Link>
            <Link
              href={siteConfig.links.signup}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Request onboarding
            </Link>
          </div>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="space-y-4">
            <h3 className="text-sm font-medium uppercase tracking-wide">Tenant tools</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link href={siteConfig.links.tenantHandbook} className="transition-colors hover:text-primary">
                  Tenant handbook
                </Link>
              </li>
              <li>
                <Link href="#rent" className="transition-colors hover:text-primary">
                  Rent collection
                </Link>
              </li>
              <li>
                <Link href="#amenities" className="transition-colors hover:text-primary">
                  Amenity booking
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-medium uppercase tracking-wide">Manager tools</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link href={siteConfig.links.managerGuide} className="transition-colors hover:text-primary">
                  Manager playbook
                </Link>
              </li>
              <li>
                <Link href="#visitors" className="transition-colors hover:text-primary">
                  Visitor policies
                </Link>
              </li>
              <li>
                <Link href={siteConfig.links.status} className="transition-colors hover:text-primary">
                  System status
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-medium uppercase tracking-wide">Connect</h3>
            <div className="flex space-x-3">
              <Link href={siteConfig.links.github} target="_blank" rel="noreferrer">
                <div className={buttonVariants({ size: "icon", variant: "ghost" })}>
                  <Icons.gitHub className="size-5" />
                  <span className="sr-only">GitHub</span>
                </div>
              </Link>
              <Link href={siteConfig.links.twitter} target="_blank" rel="noreferrer">
                <div className={buttonVariants({ size: "icon", variant: "ghost" })}>
                  <Icons.twitter className="size-4" />
                  <span className="sr-only">Twitter</span>
                </div>
              </Link>
              <Link href={siteConfig.links.linkedin} target="_blank" rel="noreferrer">
                <div className={buttonVariants({ size: "icon", variant: "ghost" })}>
                  <Icons.linkedin className="size-5" />
                  <span className="sr-only">LinkedIn</span>
                </div>
              </Link>
            </div>
            <Link href={siteConfig.links.support} className="text-sm font-medium text-primary hover:underline">
              Visit the support center
            </Link>
          </div>
        </div>
      </div>
      <div className="container border-t py-6">
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {siteConfig.name}. Empowering harmonious shared living.
        </p>
      </div>
    </footer>
  )
}
