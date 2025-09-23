"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { siteConfig } from "@/config/site"
import type { VoiceIntent } from "@/lib/voice/voice-intents"

interface CommandPaletteContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  inputValue: string
  setInputValue: (value: string) => void
  runIntent: (intent: VoiceIntent) => void
}

const CommandPaletteContext = React.createContext<CommandPaletteContextValue | null>(
  null
)

export function useCommandPalette(): CommandPaletteContextValue {
  const context = React.useContext(CommandPaletteContext)
  if (!context) {
    throw new Error("useCommandPalette must be used within a CommandPaletteProvider")
  }
  return context
}

interface CommandPaletteProviderProps {
  children: React.ReactNode
}

export function CommandPaletteProvider({
  children,
}: CommandPaletteProviderProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  const navCommands = React.useMemo(
    () => siteConfig.mainNav.filter((item) => item.href && !item.disabled),
    []
  )

  const closePalette = React.useCallback(() => {
    setOpen(false)
    setInputValue("")
  }, [])

  const runIntent = React.useCallback(
    (intent: VoiceIntent) => {
      switch (intent.type) {
        case "navigate": {
          closePalette()
          router.push(intent.href)
          break
        }
        case "search": {
          setInputValue(intent.query)
          setOpen(true)
          break
        }
        case "unknown": {
          setInputValue(intent.transcript)
          setOpen(true)
          break
        }
      }
    },
    [closePalette, router]
  )

  React.useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [])

  const contextValue = React.useMemo(
    () => ({ open, setOpen, inputValue, setInputValue, runIntent }),
    [open, inputValue, runIntent]
  )

  return (
    <CommandPaletteContext.Provider value={contextValue}>
      {children}
      <CommandDialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) {
            setInputValue("")
          }
        }}
      >
        <CommandInput
          value={inputValue}
          onValueChange={setInputValue}
          placeholder="Search roomsily or type a command"
        />
        <CommandList>
          <CommandEmpty>No matching commands.</CommandEmpty>
          <CommandGroup heading="Navigate">
            {navCommands.map((item) => (
              <CommandItem
                key={item.href}
                value={`${item.title} ${item.href}`}
                onSelect={() => {
                  if (item.href) {
                    closePalette()
                    router.push(item.href)
                  }
                }}
              >
                {item.title}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </CommandPaletteContext.Provider>
  )
}
