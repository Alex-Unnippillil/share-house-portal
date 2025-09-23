"use client"

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { usePathname, useRouter } from "next/navigation"
import { CalendarCheck2, FileText, Home, Inbox, UserPlus, Wrench } from "lucide-react"

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
import { siteConfig } from "@/config/site"
import {
  searchBookingsForCommandPalette,
  searchDocumentsForCommandPalette,
  type CommandPaletteResultItem,
} from "@/lib/navigation/command-palette"
import useSupabaseBrowser from "@/utils/supabase-browser"
import { useHotkeys, type HotkeyConfig } from "@/hooks/use-hotkeys"

const SEARCH_DELAY = 200

const quickActions = [
  {
    id: "invite-roommate",
    title: "Invite roommate",
    description: "Send an onboarding link to a new roommate",
    href: "/onboarding?flow=invite-roommate",
    shortcut: "⌘I",
    combos: ["meta+i", "ctrl+i"],
    icon: UserPlus,
  },
  {
    id: "log-maintenance",
    title: "Log maintenance",
    description: "Create a new maintenance request",
    href: "/maintenance?new=1",
    shortcut: "⌘M",
    combos: ["meta+m", "ctrl+m"],
    icon: Wrench,
  },
] as const

type CommandPaletteContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
  trigger: () => void
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null)

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext)
  if (!context) {
    throw new Error("useCommandPalette must be used within a CommandPaletteProvider")
  }

  return context
}

type CommandPaletteProviderProps = {
  children: ReactNode
}

export function CommandPaletteProvider({ children }: CommandPaletteProviderProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const prefetched = useRef(new Set<string>())

  const trigger = useCallback(() => setOpen(true), [])
  const toggle = useCallback(() => setOpen((value) => !value), [])

  const prefetchRoute = useCallback(
    (href: string) => {
      if (!href || prefetched.current.has(href)) {
        return
      }

      prefetched.current.add(href)
      router.prefetch(href).catch(() => {
        // Ignore prefetch errors—navigation will still work via push.
      })
    },
    [router],
  )

  const hotkeyConfigs = useMemo<HotkeyConfig[]>(
    () => [
      {
        combo: "meta+k",
        handler: () => setOpen(true),
      },
      {
        combo: "ctrl+k",
        handler: () => setOpen(true),
      },
      ...quickActions.flatMap((action) =>
        action.combos.map<HotkeyConfig>((combo) => ({
          combo,
          handler: () => {
            setOpen(false)
            prefetchRoute(action.href)
            router.push(action.href)
          },
        })),
      ),
    ],
    [prefetchRoute, router],
  )

  useHotkeys(hotkeyConfigs, [open])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const handleNavigate = useCallback(
    (href: string) => {
      prefetchRoute(href)
      router.push(href)
    },
    [prefetchRoute, router],
  )

  const contextValue = useMemo<CommandPaletteContextValue>(
    () => ({
      open,
      setOpen,
      toggle,
      trigger,
    }),
    [open, toggle, trigger],
  )

  return (
    <CommandPaletteContext.Provider value={contextValue}>
      {children}
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        onPrefetch={prefetchRoute}
        onNavigate={handleNavigate}
      />
    </CommandPaletteContext.Provider>
  )
}

type CommandPaletteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPrefetch: (href: string) => void
  onNavigate: (href: string) => void
}

function CommandPalette({ open, onOpenChange, onPrefetch, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [documentResults, setDocumentResults] = useState<CommandPaletteResultItem[]>([])
  const [bookingResults, setBookingResults] = useState<CommandPaletteResultItem[]>([])
  const supabase = useSupabaseBrowser()
  const searchRequest = useRef<number | null>(null)

  useEffect(() => {
    if (!open) {
      setQuery("")
      setDebouncedQuery("")
      setDocumentResults([])
      setBookingResults([])
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query)
    }, SEARCH_DELAY)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [open, query])

  useEffect(() => {
    if (!open) {
      return
    }

    const activeSearchId = (searchRequest.current ?? 0) + 1
    searchRequest.current = activeSearchId

    const shouldSearch = debouncedQuery.trim().length >= 2
    if (!shouldSearch) {
      setDocumentResults([])
      setBookingResults([])
      return
    }

    const load = async () => {
      try {
        const [documents, bookings] = await Promise.all([
          searchDocumentsForCommandPalette({ client: supabase, query: debouncedQuery }),
          searchBookingsForCommandPalette({ client: supabase, query: debouncedQuery }),
        ])

        if (searchRequest.current !== activeSearchId) {
          return
        }

        setDocumentResults(documents)
        setBookingResults(bookings)
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Command palette search failed", error)
        }
      }
    }

    void load()
  }, [debouncedQuery, open, supabase])

  const handleSelect = useCallback(
    (href: string) => {
      onOpenChange(false)
      onPrefetch(href)
      onNavigate(href)
    },
    [onNavigate, onOpenChange, onPrefetch],
  )

  const navItems = useMemo(
    () =>
      siteConfig.mainNav.map((item) => ({
        ...item,
        icon: item.href === "/" ? Home : item.href === "/documents" ? FileText : Inbox,
      })),
    [],
  )

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search pages, bookings, documents..."
      />
      <CommandList>
        <CommandEmpty>No matches found. Try another search.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {navItems.map((item) => {
            const Icon = item.icon
            const searchValue = `${item.title} ${item.href}`.trim()
            return (
              <CommandItem
                key={item.href}
                value={searchValue}
                onSelect={() => handleSelect(item.href)}
                onMouseEnter={() => onPrefetch(item.href)}
                onFocus={() => onPrefetch(item.href)}
              >
                <Icon className="mr-2 size-4" />
                <span>{item.title}</span>
              </CommandItem>
            )
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick actions">
          {quickActions.map((action) => {
            const Icon = action.icon
            const searchValue = `${action.title} ${action.description}`.trim()
            return (
              <CommandItem
                key={action.id}
                value={searchValue}
                onSelect={() => handleSelect(action.href)}
                onMouseEnter={() => onPrefetch(action.href)}
                onFocus={() => onPrefetch(action.href)}
              >
                <Icon className="mr-2 size-4" />
                <div className="flex flex-col">
                  <span>{action.title}</span>
                  <span className="text-xs text-muted-foreground">{action.description}</span>
                </div>
                <CommandShortcut>{action.shortcut}</CommandShortcut>
              </CommandItem>
            )
          })}
        </CommandGroup>
        {documentResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Documents">
              {documentResults.map((document) => {
                const searchValue = `${document.title} ${document.subtitle ?? ""}`.trim()
                return (
                  <CommandItem
                    key={document.id}
                    value={searchValue}
                    onSelect={() => handleSelect(document.href)}
                    onMouseEnter={() => onPrefetch(document.href)}
                    onFocus={() => onPrefetch(document.href)}
                  >
                    <FileText className="mr-2 size-4" />
                    <div className="flex flex-col">
                      <span>{document.title}</span>
                      {document.subtitle ? (
                        <span className="text-xs text-muted-foreground">{document.subtitle}</span>
                      ) : null}
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </>
        )}
        {bookingResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Bookings">
              {bookingResults.map((booking) => {
                const searchValue = `${booking.title} ${booking.subtitle ?? ""}`.trim()
                return (
                  <CommandItem
                    key={booking.id}
                    value={searchValue}
                    onSelect={() => handleSelect(booking.href)}
                    onMouseEnter={() => onPrefetch(booking.href)}
                    onFocus={() => onPrefetch(booking.href)}
                  >
                    <CalendarCheck2 className="mr-2 size-4" />
                    <div className="flex flex-col">
                      <span>{booking.title}</span>
                      {booking.subtitle ? (
                        <span className="text-xs text-muted-foreground">{booking.subtitle}</span>
                      ) : null}
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
