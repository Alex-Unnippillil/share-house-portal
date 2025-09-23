"use client"

import { useEffect, useRef, useState } from "react"

import { usePathname, useRouter } from "next/navigation"

import { QuickAddInput } from "@/components/quick-add/quick-add-input"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"

const navigationCommands = [
  {
    id: "dashboard",
    label: "Dashboard overview",
    href: "/dashboard",
    description: "See rent, bookings, visitors and recent documents",
  },
  {
    id: "payments",
    label: "Payments",
    href: "/payments",
    description: "Review rent history and record catch-up payments",
  },
  {
    id: "schedule",
    label: "Amenity schedule",
    href: "/schedule",
    description: "Reserve kitchen, TV room, parking and more",
  },
  {
    id: "documents",
    label: "Documents",
    href: "/documents",
    description: "Access leases, house rules and shared files",
  },
  {
    id: "maintenance",
    label: "Maintenance",
    href: "/maintenance",
    description: "Track open tickets and vendor status",
  },
  {
    id: "visitors",
    label: "Visitor log",
    href: "/visitors",
    description: "Manage overnight guest approvals",
  },
] as const

type NavigationCommand = (typeof navigationCommands)[number]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const quickAddRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((previous) => !previous)
        return
      }

      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const target = event.target as HTMLElement | null
        const tagName = target?.tagName?.toLowerCase()
        const isEditable = target?.isContentEditable
        const isFormElement = tagName && ["input", "textarea", "select"].includes(tagName)

        if (!isFormElement && !isEditable) {
          event.preventDefault()
          setOpen(true)
          requestAnimationFrame(() => {
            quickAddRef.current?.focus()
          })
        }
      }
    }

    window.addEventListener("keydown", down)
    return () => window.removeEventListener("keydown", down)
  }, [])

  useEffect(() => {
    if (!open) return
    const handle = requestAnimationFrame(() => {
      quickAddRef.current?.focus()
    })
    return () => cancelAnimationFrame(handle)
  }, [open])

  const handleSelect = (command: NavigationCommand) => {
    setOpen(false)
    router.push(command.href)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div className="border-b bg-muted/40 p-3">
        <QuickAddInput
          ref={quickAddRef}
          variant="command"
          placeholder="/invoice 200 CAD due Friday"
          onCompleted={() => setOpen(false)}
        />
      </div>
      <CommandInput placeholder="Search destinations" autoFocus={false} />
      <CommandList>
        <CommandEmpty>No matching commands.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {navigationCommands.map((command) => (
            <CommandItem
              key={command.id}
              value={`${command.label} ${command.description}`}
              onSelect={() => handleSelect(command)}
            >
              <div className="flex w-full items-center justify-between gap-4">
                <div className="flex flex-col text-sm">
                  <span className="font-medium text-foreground">{command.label}</span>
                  <span className="text-xs text-muted-foreground">{command.description}</span>
                </div>
                {pathname === command.href ? (
                  <Badge variant="outline">Current</Badge>
                ) : null}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Shortcuts">
          <CommandItem disabled>/ opens quick add</CommandItem>
          <CommandItem disabled>⌘K (or Ctrl+K) toggles this palette</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
