"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

const AVAILABLE_THEMES = ["light", "dark", "high-contrast"] as const

export function ThemeProvider({
  children,
  storageKey = "share-house-theme",
  themes,
  ...props
}: ThemeProviderProps) {
  const mergedThemes = React.useMemo(
    () => Array.from(new Set([...(themes ?? []), ...AVAILABLE_THEMES])),
    [themes],
  )

  return (
    <NextThemesProvider
      {...props}
      storageKey={storageKey}
      themes={mergedThemes}
    >
      {children}
    </NextThemesProvider>
  )
}
