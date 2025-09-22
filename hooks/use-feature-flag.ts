'use client'

import { useContext } from 'react'

import type { FeatureFlagName } from '@/config/feature-flags'
import { FeatureFlagContext } from '@/components/feature-flag-provider'

export function useFeatureFlag(flag: FeatureFlagName): boolean {
  const context = useContext(FeatureFlagContext)

  if (!context) {
    throw new Error('useFeatureFlag must be used within a FeatureFlagProvider')
  }

  return context.flags[flag]
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagContext)

  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider')
  }

  return context.flags
}
