"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const INTERACTION_GUARD_TAGS = new Set(["INPUT", "TEXTAREA"])
const COMBO_TIMEOUT = 800

type ShortcutEntry = {
  id: string
  title: string
  description: string
  combo: string
  keys: string[]
  scope: string
  isActive: boolean
  action: () => void
}

function isEditableElement(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) return false

  if (INTERACTION_GUARD_TAGS.has(target.tagName)) return true

  return target.isContentEditable || target.getAttribute("role") === "textbox"
}

export function ShortcutsModal() {
  const router = useRouter()
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const [open, setOpen] = React.useState(false)
  const keyBufferRef = React.useRef<string[]>([])
  const lastKeyTimeRef = React.useRef(0)

  React.useEffect(() => {
    if (!open) {
      keyBufferRef.current = []
    }
  }, [open])

  const shortcuts = React.useMemo<ShortcutEntry[]>(() => {
    return [
      {
        id: "open-shortcuts",
        title: "Show shortcuts",
        description: "Press ? anytime to open this list.",
        combo: "?",
        keys: ["?"],
        scope: "Global",
        isActive: open,
        action: () => setOpen(true),
      },
      {
        id: "nav-dashboard",
        title: "Go to dashboard",
        description: "Press g then d to jump to your dashboard.",
        combo: "g d",
        keys: ["g", "d"],
        scope: "Navigation",
        isActive: Boolean(pathname?.startsWith("/dashboard")),
        action: () => router.push("/dashboard"),
      },
      {
        id: "nav-bookings",
        title: "Open bookings",
        description: "Press g then b to review amenity reservations.",
        combo: "g b",
        keys: ["g", "b"],
        scope: "Navigation",
        isActive: Boolean(pathname?.startsWith("/bookings")),
        action: () => router.push("/bookings"),
      },
      {
        id: "nav-messaging",
        title: "Open messaging",
        description: "Press g then m to check roommate threads.",
        combo: "g m",
        keys: ["g", "m"],
        scope: "Navigation",
        isActive: Boolean(pathname?.startsWith("/messaging")),
        action: () => router.push("/messaging"),
      },
      {
        id: "toggle-theme",
        title:
          resolvedTheme === "dark"
            ? "Switch to light mode"
            : "Switch to dark mode",
        description: "Press t to toggle between dark and light themes.",
        combo: "t",
        keys: ["t"],
        scope: "Global",
        isActive: resolvedTheme === "dark",
        action: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
      },
    ]
  }, [open, pathname, resolvedTheme, router, setTheme])

  const groupedShortcuts = React.useMemo(() => {
    return shortcuts.reduce((acc, shortcut) => {
      if (!acc[shortcut.scope]) {
        acc[shortcut.scope] = []
      }
      acc[shortcut.scope].push(shortcut)
      return acc
    }, {} as Record<string, ShortcutEntry[]>)
  }, [shortcuts])

  React.useEffect(() => {
    setOpen(false)
  }, [pathname])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isEditableElement(event.target)) return

      if (event.key === "Escape" && open) {
        event.preventDefault()
        setOpen(false)
        return
      }

      if (event.key.length !== 1) return

      const normalisedKey = event.key.toLowerCase()
      const now = Date.now()

      if (now - lastKeyTimeRef.current > COMBO_TIMEOUT) {
        keyBufferRef.current = []
      }

      lastKeyTimeRef.current = now
      keyBufferRef.current.push(normalisedKey)

      const sequence = keyBufferRef.current.join(" ")
      const matchedShortcut = shortcuts.find(
        (shortcut) => shortcut.combo === sequence
      )

      if (matchedShortcut) {
        event.preventDefault()
        matchedShortcut.action()
        keyBufferRef.current = []
        return
      }

      const hasPartialMatch = shortcuts.some((shortcut) =>
        shortcut.combo.startsWith(sequence)
      )

      if (!hasPartialMatch) {
        keyBufferRef.current = []
      } else {
        const maxComboLength = Math.max(
          ...shortcuts.map((shortcut) => shortcut.combo.split(" ").length)
        )

        if (keyBufferRef.current.length > maxComboLength) {
          keyBufferRef.current = keyBufferRef.current.slice(-maxComboLength)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, shortcuts])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent aria-describedby="keyboard-shortcuts-description">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription id="keyboard-shortcuts-description">
            Speed up navigation and routine actions. Active shortcuts are
            highlighted based on your current view.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {Object.entries(groupedShortcuts).map(([scope, entries]) => (
            <section key={scope} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {scope}
              </h3>
              <ul className="grid gap-3 sm:grid-cols-2">
                {entries.map((shortcut) => (
                  <li key={shortcut.id}>
                    <div
                      className={cn(
                        "flex h-full items-start justify-between gap-4 rounded-md border border-border/60 bg-muted/30 p-3 text-left text-sm transition",
                        shortcut.isActive &&
                          "border-primary bg-primary/10 text-foreground shadow-sm"
                      )}
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{shortcut.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {shortcut.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, index) => (
                          <span key={`${shortcut.id}-${key}-${index}`} className="flex items-center gap-1 text-xs text-muted-foreground">
                            <kbd className="rounded-md border border-border/60 bg-background px-2 py-1 font-semibold uppercase shadow-sm">
                              {key}
                            </kbd>
                            {index < shortcut.keys.length - 1 ? (
                              <span aria-hidden className="text-[10px] font-semibold uppercase text-muted-foreground">
                                then
                              </span>
                            ) : null}
                          </span>
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
