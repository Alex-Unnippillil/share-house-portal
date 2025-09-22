'use client'

import { createContext, useMemo } from 'react'

import type { FeatureFlagName } from '@/config/feature-flags'
import type { FeatureFlagSnapshot } from '@/lib/feature-flags'

export type FeatureFlagContextValue = {
  flags: FeatureFlagSnapshot
}

export const FeatureFlagContext =
  createContext<FeatureFlagContextValue | null>(null)

interface FeatureFlagProviderProps {
  children: React.ReactNode
  initialFlags: FeatureFlagSnapshot
}

export function FeatureFlagProvider({
  children,
  initialFlags,
}: FeatureFlagProviderProps) {
  const value = useMemo(
    () => ({ flags: initialFlags }),
    [initialFlags],
  )

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  )
}

export function withFeatureFlag<T extends FeatureFlagName>(
  flags: FeatureFlagSnapshot,
  flag: T,
) {
  return flags[flag]
}
