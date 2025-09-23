"use client"

import { Accessibility, BookOpenCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAccessibility } from "@/components/accessibility/accessibility-provider"

const toBoolean = (value: boolean | "indeterminate") => value === true

export function AccessibilityMenu() {
  const { dyslexiaFont, readerMode, setPreference } = useAccessibility()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Accessibility className="h-5 w-5" />
          <span className="sr-only">Open accessibility controls</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2 text-sm font-semibold">
          <Accessibility className="h-4 w-4" />
          Accessibility
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={dyslexiaFont}
          onCheckedChange={(checked) => setPreference("dyslexiaFont", toBoolean(checked))}
          className="space-y-1"
        >
          <div className="flex flex-col text-left">
            <span className="text-sm font-medium">Dyslexia-friendly font</span>
            <span className="text-xs text-muted-foreground">Use OpenDyslexic throughout the app.</span>
          </div>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={readerMode}
          onCheckedChange={(checked) => setPreference("readerMode", toBoolean(checked))}
          className="space-y-1"
        >
          <div className="flex items-start gap-2 text-left">
            <BookOpenCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Reader mode</span>
              <span className="text-xs text-muted-foreground">Shorter line lengths and taller line spacing.</span>
            </div>
          </div>
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
