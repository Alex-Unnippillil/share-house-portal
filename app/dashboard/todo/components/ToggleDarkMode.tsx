"use client"

import * as React from "react"
import { Contrast, Moon, Sun, type LucideIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  APP_THEME_LABELS,
  APP_THEMES,
  isAppTheme,
  type AppTheme,
} from "@/config/themes"

const ICONS: Record<AppTheme, LucideIcon> = {
  light: Sun,
  dark: Moon,
  "high-contrast": Contrast,
}

export default function ModeToggle() {
  const { resolvedTheme, setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const resolved = theme === "system" ? resolvedTheme : theme
  const activeTheme: AppTheme =
    mounted && isAppTheme(resolved) ? resolved : "light"
  const Icon = ICONS[activeTheme]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Toggle theme menu"
          size="icon"
          title={`Theme: ${APP_THEME_LABELS[activeTheme]}`}
          variant="outline"
        >
          <Icon aria-hidden className="size-[1.2rem]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {APP_THEMES.map((option) => (
          <DropdownMenuItem key={option} onClick={() => setTheme(option)}>
            {APP_THEME_LABELS[option]}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
