"use client"

import * as React from "react"
import SmartLink, { SmartLinkProps } from "@/components/navigation/SmartLink"
import { useRouter } from "next/navigation"

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

export function MobileNav({ isAuthenticated }: MobileNavProps) {
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
        <SmartLink href="/" className="inline-flex" intent="navigation">
          <span className="flex items-center space-x-2">
            <Icons.logo className="size-6" />
            <span className="font-bold">{siteConfig.name}</span>
          </span>
        </SmartLink>
      </div>

      <SheetContent side="left" className="pr-0">
        <MobileLink
          href="/"
          className="inline-flex"
          onOpenChange={setOpen}
        >
          <span className="flex items-center">
            <Icons.logo className="mr-1 size-6" />
            <span className="font-bold">{siteConfig.name}</span>
          </span>
        </MobileLink>
        <div className="px-6 py-4">
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
                href="/auth"
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
            {docsConfig.mainNav?.map(
              (item) =>
                item.href && (
                  <MobileLink
                    key={item.href}
                    href={item.href}
                    onOpenChange={setOpen}
                  >
                    {item.title}
                  </MobileLink>
                )
            )}
          </div>
          <div className="flex flex-col space-y-2">
            {docsConfig.sidebarNav.map((item, index) => (
              <div key={index} className="flex flex-col space-y-3 pt-6">
                <h4 className="font-medium">{item.title}</h4>
                {item?.items?.length &&
                  item.items.map((item) => (
                    <React.Fragment key={item.href}>
                      {!item.disabled &&
                        (item.href ? (
                          <MobileLink
                            href={item.href}
                            onOpenChange={setOpen}
                            className="text-muted-foreground"
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
                        ) : (
                          item.title
                        ))}
                    </React.Fragment>
                  ))}
              </div>
            ))}
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

function MobileLink({
  href,
  onOpenChange,
  className,
  children,
  ...props
}: MobileLinkProps) {
  const router = useRouter()
  return (
    <SmartLink
      href={href}
      onClick={() => {
        router.push(href.toString())
        onOpenChange?.(false)
      }}
      className={cn(className)}
      intent="navigation"
      {...props}
    >
      {children}
    </SmartLink>
  )
}
