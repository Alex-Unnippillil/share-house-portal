"use client"

import { createContext, useContext } from "react"

import type { InvitePrefetchContext } from "./types"

const InvitePrefetchContextInstance = createContext<InvitePrefetchContext | null>(null)

export const InviteContextProvider = InvitePrefetchContextInstance.Provider

export function useInviteContext(): InvitePrefetchContext {
  const context = useContext(InvitePrefetchContextInstance)

  if (!context) {
    throw new Error("useInviteContext must be used within an InviteContextProvider")
  }

  return context
}
