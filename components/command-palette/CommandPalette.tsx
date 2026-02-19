"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Command as CommandIcon } from "lucide-react"

import type { PaletteQuickAction, PortalRole, RoleNavItem } from "@/config/navigation"
import { getCommandPaletteNavigation } from "@/config/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"

type CommandPaletteProps = {
  role: PortalRole | null
}

function isMacOS() {
  if (typeof window === "undefined") {
    return false
  }

  return window.navigator.platform.toUpperCase().includes("MAC")
}

export function CommandPalette({ role }: CommandPaletteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const paletteConfig = useMemo(() => getCommandPaletteNavigation(role), [role])

  const documentSearchHref = `/dashboard/operations/search?q=${encodeURIComponent(`documents ${search}`.trim())}`
  const messageSearchHref = `/dashboard/operations/search?q=${encodeURIComponent(`messages ${search}`.trim())}`

  const searchActions: PaletteQuickAction[] = [
    {
      id: "document",
      title: search ? `Search documents for “${search}”` : "Search documents",
      subtitle: "Uses the operations global search endpoint when available",
      href: documentSearchHref,
    },
    {
      id: "maintenance",
      title: search ? `Search messages for “${search}”` : "Search messages",
      subtitle: "Routes to global search for message and thread matches",
      href: messageSearchHref,
    },
  ]

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((currentOpen) => !currentOpen)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const navigateTo = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  const shortcutLabel = isMacOS() ? "⌘K" : "Ctrl+K"

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="min-w-44 justify-between text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <span className="inline-flex items-center gap-2">
          <CommandIcon className="size-4" />
          Command menu
        </span>
        <kbd className="rounded border px-1.5 py-0.5 text-[10px]">{shortcutLabel}</kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder={`Search routes and actions (${paletteConfig.roleLabel})`}
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>No matching routes or actions found.</CommandEmpty>

          <CommandGroup heading="Navigate">
            {paletteConfig.routes.map((route: RoleNavItem) => {
              const active = pathname === route.href
              return (
                <CommandItem
                  key={route.href}
                  value={`${route.title} ${route.subtitle ?? ""} ${route.href}`}
                  onSelect={() => navigateTo(route.href ?? "/")}
                  className={cn(active && "bg-accent")}
                >
                  <span>{route.title}</span>
                  <CommandShortcut>{route.href}</CommandShortcut>
                </CommandItem>
              )
            })}
          </CommandGroup>

          <CommandGroup heading="Quick actions">
            {paletteConfig.quickActions.map((action) => (
              <CommandItem
                key={action.id}
                value={`${action.title} ${action.subtitle}`}
                onSelect={() => navigateTo(action.href)}
              >
                <div className="flex flex-col">
                  <span>{action.title}</span>
                  <span className="text-xs text-muted-foreground">{action.subtitle}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Search">
            {searchActions.map((action) => (
              <CommandItem
                key={`${action.id}-${action.title}`}
                value={`${action.title} ${action.subtitle}`}
                onSelect={() => navigateTo(action.href)}
              >
                <div className="flex flex-col">
                  <span>{action.title}</span>
                  <span className="text-xs text-muted-foreground">{action.subtitle}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
