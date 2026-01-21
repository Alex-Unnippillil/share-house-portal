"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { ReactNode } from "react"

import { DEFAULT_LOCALE, DEFAULT_TIMEZONE } from "@/config/preferences"

function getRuntimeTimezone() {
  if (typeof Intl !== "undefined" && typeof Intl.DateTimeFormat === "function") {
    try {
      const { timeZone } = new Intl.DateTimeFormat().resolvedOptions()
      if (typeof timeZone === "string" && timeZone.trim().length > 0) {
        return timeZone
      }
    } catch (error) {
      console.warn("Unable to determine runtime timezone", error)
    }
  }

  return DEFAULT_TIMEZONE
}

function normaliseLocale(locale: string | null | undefined) {
  const trimmed = locale?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_LOCALE
}

function normaliseTimezone(timezone: string | null | undefined) {
  const candidate = timezone?.trim()
  if (!candidate) {
    return getRuntimeTimezone()
  }

  try {
    new Intl.DateTimeFormat(undefined, { timeZone: candidate })
    return candidate
  } catch (error) {
    console.warn(`Invalid timezone provided: ${candidate}`, error)
    return getRuntimeTimezone()
  }
}

function parseDateInput(value: Date | string | number | null | undefined) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  return null
}

export function createFormatters(localeInput: string | null | undefined, timezoneInput: string | null | undefined) {
  const locale = normaliseLocale(localeInput)
  const timezone = normaliseTimezone(timezoneInput)

  const formatDate = (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => {
    const date = parseDateInput(value)
    if (!date) return ""

    try {
      return new Intl.DateTimeFormat(locale, { timeZone: timezone, ...options }).format(date)
    } catch (error) {
      console.warn("Falling back to default date formatter", error)
      return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
        timeZone: DEFAULT_TIMEZONE,
        ...options,
      }).format(date)
    }
  }

  const formatCurrency = (
    value: number,
    currency: string = "USD",
    options?: Intl.NumberFormatOptions,
  ) => {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        ...options,
      }).format(value)
    } catch (error) {
      console.warn("Falling back to default currency formatter", error)
      return new Intl.NumberFormat(DEFAULT_LOCALE, {
        style: "currency",
        currency: "USD",
        ...options,
      }).format(value)
    }
  }

  return {
    locale,
    timezone,
    formatDate,
    formatCurrency,
  }
}

const defaultFormatters = createFormatters(DEFAULT_LOCALE, DEFAULT_TIMEZONE)

interface PreferencesContextValue {
  locale: string
  timezone: string
  setLocale: (locale: string) => void
  setTimezone: (timezone: string) => void
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string
  formatCurrency: (
    value: number,
    currency?: string,
    options?: Intl.NumberFormatOptions,
  ) => string
}

const PreferencesContext = createContext<PreferencesContextValue>({
  ...defaultFormatters,
  setLocale: () => undefined,
  setTimezone: () => undefined,
})

interface PreferencesProviderProps {
  children: ReactNode
  initialLocale?: string | null
  initialTimezone?: string | null
}

export function PreferencesProvider({
  children,
  initialLocale,
  initialTimezone,
}: PreferencesProviderProps) {
  const [locale, setLocaleState] = useState(() => normaliseLocale(initialLocale))
  const [timezone, setTimezoneState] = useState(() => normaliseTimezone(initialTimezone))

  const updateLocale = useCallback((nextLocale: string) => {
    setLocaleState(normaliseLocale(nextLocale))
  }, [])

  const updateTimezone = useCallback((nextTimezone: string) => {
    setTimezoneState(normaliseTimezone(nextTimezone))
  }, [])

  const formatters = useMemo(() => createFormatters(locale, timezone), [locale, timezone])

  const value = useMemo(
    () => ({
      ...formatters,
      setLocale: updateLocale,
      setTimezone: updateTimezone,
    }),
    [formatters, updateLocale, updateTimezone],
  )

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences() {
  return useContext(PreferencesContext)
}

export function getDefaultTimezone() {
  return getRuntimeTimezone()
}
