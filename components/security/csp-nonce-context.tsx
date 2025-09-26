'use client'

import { createContext, useContext, type ReactNode } from 'react'

const CspNonceContext = createContext<string | null>(null)

interface CspNonceProviderProps {
  children: ReactNode
  nonce?: string
}

export function CspNonceProvider({ children, nonce }: CspNonceProviderProps) {
  return (
    <CspNonceContext.Provider value={nonce ?? null}>
      {children}
    </CspNonceContext.Provider>
  )
}

export function useCspNonce() {
  return useContext(CspNonceContext)
}
