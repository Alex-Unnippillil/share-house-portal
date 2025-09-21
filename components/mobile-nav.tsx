"use client"

import * as React from "react"
import Link, { LinkProps } from "next/link"
import { useRouter } from "next/navigation"

import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Icons } from "@/components/icons"
import { SignOutButton } from "@/components/sign-out-button"
import type { NavItem } from "@/types/nav"
import type { TenantMembership } from "@/types/tenant"
import { TenantSwitcher } from "@/components/tenant-switcher"

interface MobileNavProps {
  isAuthenticated: boolean
  items: NavItem[]
  tenants?: TenantMembership[]
}

export function MobileNav({ isAuthenticated, items, tenants = [] }: MobileNavProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="mr-0 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
        >
          <Icons.menu className="size-6" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <div className="xs:items-center ml-1 gap-4 md:hidden">
        <Link href="/" className="flex items-center space-x-2">
          <Icons.logo className="size-6" />
          <span className="font-bold">{siteConfig.name}</span>
        </Link>
      </div>

      <SheetContent side="left" className="pr-0">
        <MobileLink
          href="/"
          className="flex items-center"
          onOpenChange={setOpen}
        >
          <Icons.logo className="mr-1 size-6" />
          <span className="font-bold">{siteConfig.name}</span>
        </MobileLink>
        <div className="px-6 py-4">
          {tenants.length > 1 ? (
            <div className="mb-4">
              <TenantSwitcher tenants={tenants} className="w-full" />
            </div>
          ) : null}
          {isAuthenticated ? (
            <div className="flex flex-col gap-2">
              <MobileLink
                href="/dashboard"
                onOpenChange={setOpen}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "justify-center"
                )}
              >
                Dashboard
              </MobileLink>
              <SignOutButton
                variant="outline"
                size="sm"
                className="w-full justify-center"
                formClassName="w-full"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <MobileLink
                href="/auth/login"
                onOpenChange={setOpen}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "justify-center"
                )}
              >
                Log in
              </MobileLink>
              <MobileLink
                href="/onboarding"
                onOpenChange={setOpen}
                className={cn(buttonVariants({ size: "sm" }), "justify-center")}
              >
                Sign up
              </MobileLink>
            </div>
          )}
        </div>
        <ScrollArea className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
          <div className="flex flex-col space-y-3">
            {items.map((item) =>
              item.href ? (
                <MobileLink
                  key={item.href}
                  href={item.href}
                  onOpenChange={setOpen}
                  className={cn(item.disabled && "pointer-events-none opacity-60")}
                >
                  <span>{item.title}</span>
                  {item.label ? (
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {item.label}
                    </span>
                  ) : null}
                </MobileLink>
              ) : null
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

interface MobileLinkProps extends LinkProps {
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
}

function MobileLink({
  href,
  onOpenChange,
  className,
  children,
  ...props
}: MobileLinkProps) {
  const router = useRouter()
  return (
    <Link
      href={href}
      onClick={() => {
        router.push(href.toString())
        onOpenChange?.(false)
      }}
      className={cn(className)}
      {...props}
    >
      {children}
    </Link>
  )
}
