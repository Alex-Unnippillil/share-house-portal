"use client"

import * as React from "react"
import SmartLink, { SmartLinkProps } from "@/components/navigation/SmartLink"
import { usePathname } from "next/navigation"

import { docsConfig } from "@/config/docs"
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Icons } from "@/components/icons"
import { SignOutButton } from "@/components/sign-out-button"

interface MobileNavProps {
  isAuthenticated: boolean
}

const mobileLinkBaseClassName =
  "inline-flex w-fit rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors motion-safe:transition-all motion-safe:duration-150 motion-safe:ease-out hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

export function MobileNav({ isAuthenticated }: MobileNavProps) {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="mr-0 px-0 text-base hover:bg-transparent md:hidden">
          <Icons.menu className="size-6" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <div className="xs:items-center ml-1 gap-4 md:hidden">
        <SmartLink href="/" className="inline-flex" intent="navigation">
          <span className="flex items-center space-x-2">
            <Icons.logo className="size-6" />
            <span className="font-bold">{siteConfig.name}</span>
          </span>
        </SmartLink>
      </div>

      <SheetContent side="left" className="pr-0">
        <MobileLink href="/" className="inline-flex" onOpenChange={setOpen} isActive={pathname === "/"}>
          <span className="flex items-center">
            <Icons.logo className="mr-1 size-6" />
            <span className="font-bold">{siteConfig.name}</span>
          </span>
        </MobileLink>

        <nav aria-labelledby="mobile-auth-actions-heading" className="px-6 py-4">
          <h2
            id="mobile-auth-actions-heading"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Account actions
          </h2>
          {isAuthenticated ? (
            <div className="mt-3 flex flex-col gap-2">
              <MobileLink
                href="/dashboard"
                onOpenChange={setOpen}
                isActive={pathname === "/dashboard"}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "justify-center motion-safe:transition-all"
                )}
              >
                Dashboard
              </MobileLink>
              <SignOutButton
                variant="outline"
                size="sm"
                className="w-full justify-center motion-safe:transition-all"
                formClassName="w-full"
              />
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              <MobileLink
                href="/auth"
                onOpenChange={setOpen}
                isActive={pathname === "/auth"}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "justify-center motion-safe:transition-all"
                )}
              >
                Log in
              </MobileLink>
              <MobileLink
                href="/onboarding"
                onOpenChange={setOpen}
                isActive={pathname === "/onboarding"}
                className={cn(buttonVariants({ size: "sm" }), "justify-center motion-safe:transition-all")}
              >
                Sign up
              </MobileLink>
            </div>
          )}
        </nav>

        <ScrollArea className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
          <nav aria-labelledby="mobile-primary-links-heading" className="flex flex-col space-y-3">
            <h2
              id="mobile-primary-links-heading"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Main navigation
            </h2>
            <ul className="flex flex-col gap-1" role="list">
              {docsConfig.mainNav?.map(
                (item) =>
                  item.href && (
                    <li key={item.href}>
                      <MobileLink
                        href={item.href}
                        onOpenChange={setOpen}
                        isActive={isMobileRouteActive(pathname, item.href)}
                      >
                        {item.title}
                      </MobileLink>
                    </li>
                  )
              )}
            </ul>
          </nav>

          <nav aria-labelledby="mobile-resource-links-heading" className="flex flex-col space-y-2">
            <h2
              id="mobile-resource-links-heading"
              className="pt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Resource links
            </h2>
            {docsConfig.sidebarNav.map((item, index) => (
              <div key={index} className="flex flex-col space-y-3 pt-4">
                <h4 className="font-medium">{item.title}</h4>
                <ul className="flex flex-col gap-1" role="list">
                  {item?.items?.length &&
                    item.items.map((item) => (
                      <React.Fragment key={item.href}>
                        {!item.disabled &&
                          (item.href ? (
                            <li>
                              <MobileLink
                                href={item.href}
                                onOpenChange={setOpen}
                                className="text-muted-foreground"
                                isActive={isMobileRouteActive(pathname, item.href)}
                              >
                                <span className="flex items-center">
                                  <span>{item.title}</span>
                                  {item.label && (
                                    <span className="ml-2 rounded-md bg-[#adfa1d] px-1.5 py-0.5 text-xs leading-none text-[#000000] no-underline group-hover:no-underline">
                                      {item.label}
                                    </span>
                                  )}
                                </span>
                              </MobileLink>
                            </li>
                          ) : (
                            <li>{item.title}</li>
                          ))}
                      </React.Fragment>
                    ))}
                </ul>
              </div>
            ))}
          </nav>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

interface MobileLinkProps extends SmartLinkProps {
  onOpenChange?: (open: boolean) => void
  isActive?: boolean
  children: React.ReactNode
  className?: string
}

function MobileLink({
  href,
  onOpenChange,
  onClick,
  isActive = false,
  className,
  children,
  ...props
}: MobileLinkProps) {
  return (
    <SmartLink
      href={href}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) {
          return
        }

        onOpenChange?.(false)
      }}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        mobileLinkBaseClassName,
        isActive &&
          "bg-accent text-accent-foreground shadow-sm motion-safe:translate-x-1 motion-reduce:transform-none",
        className
      )}
      intent="navigation"
      {...props}
    >
      {children}
    </SmartLink>
  )
}

function isMobileRouteActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/"
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}
