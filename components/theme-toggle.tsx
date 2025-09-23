"use client"

import * as React from "react"
import { Contrast, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

const THEME_SEQUENCE = ["light", "dark", "high-contrast"] as const
type ThemeName = (typeof THEME_SEQUENCE)[number]

const themeIcons: Record<ThemeName, typeof Sun> = {
  light: Sun,
  dark: Moon,
  "high-contrast": Contrast,
}

const themeLabels: Record<ThemeName, string> = {
  light: "Light",
  dark: "Dark",
  "high-contrast": "High contrast",
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const activeTheme = React.useMemo(() => {
    const candidate = theme === "system" ? resolvedTheme : theme
    return THEME_SEQUENCE.includes(candidate as ThemeName)
      ? (candidate as ThemeName)
      : undefined
  }, [resolvedTheme, theme])

  const currentTheme = mounted && activeTheme ? activeTheme : "light"
  const currentIndex = THEME_SEQUENCE.indexOf(currentTheme)
  const nextTheme = THEME_SEQUENCE[(currentIndex + 1) % THEME_SEQUENCE.length]
  const Icon = themeIcons[currentTheme]

  const handleToggle = React.useCallback(() => {
    setTheme(nextTheme)
  }, [nextTheme, setTheme])

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      aria-label={`Enable ${themeLabels[nextTheme]} theme`}
      title={`Enable ${themeLabels[nextTheme]} theme`}
    >
      <Icon className="size-5" />
      <span className="sr-only">{`Theme currently set to ${themeLabels[currentTheme]}`}</span>
    </Button>
  )
}
