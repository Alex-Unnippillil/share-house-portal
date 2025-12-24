"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

import { APP_THEMES } from "@/config/themes"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      storageKey="roomsily-theme"
      themes={Array.from(APP_THEMES)}
      value={{
        light: "light",
        dark: "dark",
        "high-contrast": "high-contrast",
      }}
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
