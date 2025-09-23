"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { useTheme } from "next-themes"

import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"

interface CommandPaletteAction {
  id: string
  label: string
  keywords: string
  perform: () => void
}

export function CommandPalette() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = React.useState(false)
  const [modifierKey, setModifierKey] = React.useState<"⌘" | "Ctrl">("⌘")
  const searchLabelId = React.useId()

  React.useEffect(() => {
    const updateModifier = () => {
      if (typeof window === "undefined") return
      const isMac = /Mac|iPod|iPhone|iPad/.test(window.navigator.platform)
      setModifierKey(isMac ? "⌘" : "Ctrl")
    }

    updateModifier()
  }, [])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (event.key.toLowerCase() !== "k") return
      if (!(event.metaKey || event.ctrlKey)) return

      event.preventDefault()
      setOpen((previous) => !previous)
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const navigationItems = React.useMemo(
    () =>
      siteConfig.mainNav
        .filter((item) => Boolean(item.href && item.title))
        .map((item) => ({
          href: item.href!,
          label: item.title,
          value: `${item.title?.toLowerCase() ?? ""} ${item.href?.toLowerCase() ?? ""}`.trim(),
        })),
    []
  )

  const quickActions = React.useMemo<CommandPaletteAction[]>(
    () => [
      {
        id: "toggle-theme",
        label: theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
        keywords: "appearance theme color",
        perform: () => setTheme(theme === "dark" ? "light" : "dark"),
      },
      {
        id: "open-contact",
        label: "Contact property manager",
        keywords: "support help contact",
        perform: () => router.push("/contact"),
      },
    ],
    [router, setTheme, theme]
  )

  const handleNavigation = React.useCallback(
    (href: string) => {
      setOpen(false)
      router.push(href)
    },
    [router, setOpen]
  )

  const handleAction = React.useCallback(
    (action: CommandPaletteAction) => {
      setOpen(false)
      action.perform()
    },
    [setOpen]
  )

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Open command palette"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2"
      >
        <Search className="size-4" aria-hidden="true" />
        <span className="text-sm">Search</span>
        <kbd
          className={cn(
            "pointer-events-none hidden items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground md:inline-flex"
          )}
        >
          {modifierKey} K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <span id={searchLabelId} className="sr-only">
          Command palette search
        </span>
        <CommandInput
          placeholder="Search for pages and quick actions"
          aria-label="Command palette search"
          aria-labelledby={searchLabelId}
        />
        <CommandList>
          <CommandEmpty>No matches found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {navigationItems.map((item) => (
              <CommandItem
                key={item.href}
                value={item.value}
                onSelect={() => handleNavigation(item.href)}
              >
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Quick Actions">
            {quickActions.map((action) => (
              <CommandItem
                key={action.id}
                value={`${action.label.toLowerCase()} ${action.keywords}`}
                onSelect={() => handleAction(action)}
              >
                {action.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}

export default CommandPalette
