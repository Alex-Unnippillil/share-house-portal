import { SupabasePackageRepository } from './repository'
import { createNotificationProvider } from './notifications'
import { createServiceRoleClient } from './supabase-client'

export function createPackageServiceContext() {
  const client = createServiceRoleClient()
  const repo = new SupabasePackageRepository(client)
  const notifications = createNotificationProvider()

  return { repo, notifications }
}
