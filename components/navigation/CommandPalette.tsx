"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { useRouter } from "next/navigation"

import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"

export type CommandPaletteNavItem = {
  title: string
  href: string
}

export type QuickAction = {
  id: string
  label: string
  description?: string
  shortcut?: string
  perform: () => void
}

interface CommandPaletteProps {
  navItems?: CommandPaletteNavItem[]
  quickActions?: QuickAction[]
  className?: string
}

function createDefaultQuickActions(navigate: (href: string) => void): QuickAction[] {
  return [
    {
      id: "pay-rent",
      label: "Pay rent",
      description: "Jump straight to the secure rent payment flow.",
      shortcut: "P",
      perform: () => navigate("/payments"),
    },
    {
      id: "log-maintenance",
      label: "Submit maintenance request",
      description: "Report an issue and notify the property manager in seconds.",
      shortcut: "M",
      perform: () => navigate("/maintenance"),
    },
    {
      id: "message-roommates",
      label: "Message roommates",
      description: "Open the shared feed to coordinate chores and updates.",
      shortcut: "G",
      perform: () => navigate("/messaging"),
    },
    {
      id: "upload-document",
      label: "Upload lease document",
      description: "Go to documents to add or review signed agreements.",
      shortcut: "D",
      perform: () => navigate("/documents"),
    },
  ]
}

export function CommandPalette({
  className,
  navItems,
  quickActions,
}: CommandPaletteProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const dialogId = React.useId()

  const navigationItems = React.useMemo(() => {
    const items = navItems ?? siteConfig.mainNav
    return items.filter((item): item is CommandPaletteNavItem => Boolean(item?.href && item?.title))
  }, [navItems])

  const actions = React.useMemo(
    () => quickActions ?? createDefaultQuickActions((href) => router.push(href)),
    [quickActions, router]
  )

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleNavigate = React.useCallback(
    (href: string) => {
      setOpen(false)
      router.push(href)
    },
    [router]
  )

  const handleAction = React.useCallback((perform: QuickAction["perform"]) => {
    setOpen(false)
    perform()
  }, [])

  return (
    <>
      <Button
        type="button"
        variant="outline"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        aria-label="Open command palette"
        onClick={() => setOpen(true)}
        className={cn(
          "h-9 min-w-9 justify-center gap-2 text-sm text-muted-foreground transition-colors md:w-64 md:justify-start",
          className
        )}
      >
        <Search className="size-4" aria-hidden="true" />
        <span className="hidden flex-1 truncate text-left md:inline-flex">Search workspace…</span>
        <kbd className="hidden items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground md:flex">
          <span className="text-xs">⌘</span>
          <span>K</span>
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <div id={dialogId}>
          <CommandInput aria-label="Search commands" placeholder="Search for pages and quick actions…" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {navigationItems.length > 0 && (
              <CommandGroup heading="Navigate">
                {navigationItems.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={`${item.title} ${item.href}`}
                    onSelect={() => handleNavigate(item.href)}
                  >
                    {item.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {navigationItems.length > 0 && actions.length > 0 && <CommandSeparator />}
            {actions.length > 0 && (
              <CommandGroup heading="Quick actions">
                {actions.map((action) => (
                  <CommandItem
                    key={action.id}
                    value={action.label}
                    onSelect={() => handleAction(action.perform)}
                  >
                    <div className="flex flex-1 flex-col gap-0.5">
                      <span className="font-medium">{action.label}</span>
                      {action.description ? (
                        <span className="text-xs text-muted-foreground">{action.description}</span>
                      ) : null}
                    </div>
                    {action.shortcut ? <CommandShortcut>{action.shortcut}</CommandShortcut> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </div>
      </CommandDialog>
    </>
  )
}
