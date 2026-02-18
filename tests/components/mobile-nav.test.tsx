// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import * as React from "react"
import { describe, expect, it, vi } from "vitest"

import { MobileNav } from "@/components/mobile-nav"

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}))

vi.mock("@/components/navigation/SmartLink", () => ({
  default: ({ href, className, children, onClick, ...props }: any) => (
    <a
      href={typeof href === "string" ? href : "#"}
      className={className}
      onClick={(event) => {
        event.preventDefault()
        onClick?.(event)
      }}
      {...props}
    >
      {children}
    </a>
  ),
}))

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}))

vi.mock("@/components/ui/sheet", () => {
  const OpenContext = React.createContext<{
    open: boolean
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
  } | null>(null)

  const Sheet = ({ open, onOpenChange, children }: any) => {
    const [internalOpen, setInternalOpen] = React.useState(open ?? false)

    React.useEffect(() => {
      setInternalOpen(open ?? false)
    }, [open])

    const setOpen = (next: React.SetStateAction<boolean>) => {
      const value = typeof next === "function" ? next(internalOpen) : next
      setInternalOpen(value)
      onOpenChange?.(value)
    }

    return <OpenContext.Provider value={{ open: internalOpen, setOpen }}>{children}</OpenContext.Provider>
  }

  const SheetTrigger = ({ asChild, children }: any) => {
    const context = React.useContext(OpenContext)
    if (!context) {
      throw new Error("SheetTrigger must be used within Sheet")
    }

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        onClick: () => context.setOpen(true),
      })
    }

    return <button onClick={() => context.setOpen(true)}>{children}</button>
  }

  const SheetContent = ({ children }: any) => {
    const context = React.useContext(OpenContext)
    if (!context?.open) {
      return null
    }

    return <div>{children}</div>
  }

  return {
    Sheet,
    SheetContent,
    SheetTrigger,
  }
})

vi.mock("@/components/sign-out-button", () => ({
  SignOutButton: ({ className }: { className?: string }) => (
    <button className={className} type="button">
      Sign out
    </button>
  ),
}))

describe("MobileNav", () => {
  it("supports keyboard tab focus and exposes visible focus-ring classes", async () => {
    const user = userEvent.setup()

    render(<MobileNav isAuthenticated />)

    await user.tab()

    const toggleButton = screen.getByRole("button", { name: /toggle menu/i })
    expect(toggleButton).toHaveFocus()
    expect(toggleButton).toHaveClass("focus-visible:ring-1", "focus-visible:ring-ring")

    await user.click(toggleButton)

    const accountActionsNav = screen.getByRole("navigation", {
      name: /account actions/i,
    })
    const dashboardAction = within(accountActionsNav).getByRole("link", {
      name: /dashboard/i,
    })

    expect(dashboardAction).toHaveAttribute("aria-current", "page")
    expect(dashboardAction).toHaveClass("bg-accent", "text-accent-foreground")
  })

  it("closes the sheet menu after a mobile link click", async () => {
    const user = userEvent.setup()

    render(<MobileNav isAuthenticated={false} />)

    await user.click(screen.getByRole("button", { name: /toggle menu/i }))

    const primaryNav = screen.getByRole("navigation", { name: /main navigation/i })
    const paymentsLink = within(primaryNav).getByRole("link", { name: /payments/i })

    expect(paymentsLink).toBeInTheDocument()

    await user.click(paymentsLink)

    expect(screen.queryByRole("navigation", { name: /main navigation/i })).not.toBeInTheDocument()
  })
})
