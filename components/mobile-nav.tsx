"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import SmartLink, { SmartLinkProps } from "@/components/navigation/SmartLink"
import { Icons } from "@/components/icons"
import { SignOutButton } from "@/components/sign-out-button"
import { Button, buttonVariants } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import type { NavItem } from "@/types/nav"
import { cn } from "@/lib/utils"

interface MobileNavProps {
  appName: string
  isAuthenticated: boolean
  items: NavItem[]
}


function isActiveRoute(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function MobileNav({ appName, isAuthenticated, items }: MobileNavProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="mr-0 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 lg:hidden"
        >
          <Icons.menu className="size-6" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <div className="xs:items-center ml-1 gap-4 lg:hidden">
        <SmartLink href="/" className="inline-flex" intent="navigation">
          <span className="flex items-center space-x-2">
            <Icons.logo className="size-6" />
            <span className="font-bold">{appName}</span>
          </span>
        </SmartLink>
      </div>

      <SheetContent side="left" className="pr-0">
        <MobileLink href="/" className="inline-flex" onOpenChange={setOpen}>
          <span className="flex items-center">
            <Icons.logo className="mr-1 size-6" />
            <span className="font-bold">{appName}</span>
          </span>
        </MobileLink>
        <div className="px-6 py-4">
          {isAuthenticated ? (
            <SignOutButton
              variant="outline"
              size="sm"
              className="w-full justify-center"
              formClassName="w-full"
            />
          ) : (
            <div className="flex flex-col gap-2">
              <MobileLink
                href="/auth"
                onOpenChange={setOpen}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "justify-center")}
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
          <div className="flex flex-col space-y-2" aria-label="Mobile primary navigation">
            {items.map(
              (item) =>
                item.href && (
                  <MobileLink key={item.href} href={item.href} onOpenChange={setOpen}>
                    {item.title}
                  </MobileLink>
                )
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

interface MobileLinkProps extends SmartLinkProps {
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
}

function MobileLink({ href, onOpenChange, className, children, ...props }: MobileLinkProps) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <SmartLink
      href={href}
      onClick={() => {
        router.push(href.toString())
        onOpenChange?.(false)
      }}
      className={cn(
        "rounded-md px-2 py-1.5 text-sm",
        isActiveRoute(pathname, href.toString()) ? "bg-primary/10 text-foreground" : "text-muted-foreground",
        className
      )}
      intent="navigation"
      {...props}
    >
      {children}
    </SmartLink>
  )
}
