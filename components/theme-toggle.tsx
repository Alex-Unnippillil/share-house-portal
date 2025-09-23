"use client"

import * as React from "react"
import { Contrast, Moon, Sun, type LucideIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
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

export function ThemeToggle() {
  const { resolvedTheme, setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const resolved = theme === "system" ? resolvedTheme : theme
  const currentTheme: AppTheme =
    mounted && isAppTheme(resolved) ? resolved : "light"
  const themeOrder = APP_THEMES
  const currentIndex = Math.max(themeOrder.indexOf(currentTheme), 0)
  const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length]
  const Icon = ICONS[currentTheme]
  const nextThemeLabel = APP_THEME_LABELS[nextTheme]

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to the ${nextThemeLabel} theme`}
      title={`Theme: ${APP_THEME_LABELS[currentTheme]}`}
    >
      <Icon aria-hidden className="size-5" />
    </Button>
  )
}
