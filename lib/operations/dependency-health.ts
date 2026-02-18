import 'server-only'

import { cache } from 'react'

export type DependencyStatus = 'healthy' | 'degraded' | 'down'

export type DependencyHealth = {
  name: 'supabase' | 'stripe' | 'calcom' | 'documenso'
  status: DependencyStatus
  message: string
}

function fromEnv(name: DependencyHealth['name'], envNames: string[]): DependencyHealth {
  const missing = envNames.filter((envName) => !process.env[envName])
  if (missing.length > 0) {
    return {
      name,
      status: 'degraded',
      message: `Missing environment variables: ${missing.join(', ')}`,
    }
  }

  return {
    name,
    status: 'healthy',
    message: 'Configured and ready',
  }
}

export const getDependencyHealth = cache(async (): Promise<DependencyHealth[]> => {
  return [
    fromEnv('supabase', ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']),
    fromEnv('stripe', ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']),
    fromEnv('calcom', ['CALCOM_BASE_URL', 'CALCOM_API_KEY']),
    fromEnv('documenso', ['DOCUMENSO_BASE_URL', 'DOCUMENSO_API_KEY']),
  ]
})

export async function getReadinessSummary() {
  const dependencies = await getDependencyHealth()
  const hasDown = dependencies.some((dependency) => dependency.status === 'down')
  const hasDegraded = dependencies.some((dependency) => dependency.status === 'degraded')

  return {
    status: hasDown ? 'down' : hasDegraded ? 'degraded' : 'healthy',
    dependencies,
  }
}
