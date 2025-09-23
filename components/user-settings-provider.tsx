"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"

import {
  resolveUserSettings,
  type UserSettings,
  type UserSettingsOverrides,
} from "@/lib/user-settings"

const UserSettingsContext = createContext<UserSettings>(resolveUserSettings())

interface UserSettingsProviderProps {
  readonly value?: UserSettingsOverrides
  readonly children: ReactNode
}

export function UserSettingsProvider({ value, children }: UserSettingsProviderProps) {
  const settings = useMemo(() => resolveUserSettings(value), [value])

  return <UserSettingsContext.Provider value={settings}>{children}</UserSettingsContext.Provider>
}

export function useUserSettings() {
  return useContext(UserSettingsContext)
}
