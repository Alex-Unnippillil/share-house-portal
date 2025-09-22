"use client"

import * as React from "react"
import { Icons, MoonIcon, SunIcon } from "@/components/icons"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      <SunIcon className="h-6 w-5 dark:hidden" />
      <MoonIcon className="hidden size-5 dark:block" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
