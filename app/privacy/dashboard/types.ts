export type PrivacyDashboardSummary = {
  latestExport: {
    status: string
    requestedAt: string | null
    completedAt: string | null
    downloadUrl: string | null
  } | null
  pendingDeletion: {
    status: string
    scheduledFor: string | null
  } | null
}
