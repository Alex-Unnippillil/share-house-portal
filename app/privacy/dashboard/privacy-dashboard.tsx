'use client'

import { useMemo } from 'react'
import { useFormState, useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import {
  initialDeletionState,
  initialExportState,
  requestPrivacyExport,
  submitDeletionRequest,
} from './actions'
import type { PrivacyDashboardSummary } from './types'

interface PrivacyDashboardProps {
  email: string | null
  summary: PrivacyDashboardSummary | null
}

function formatTimestamp(timestamp: string | null | undefined) {
  if (!timestamp) {
    return null
  }

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function normalizeStatusLabel(status: string | null | undefined) {
  if (!status) {
    return 'unknown'
  }

  return status.replace(/_/g, ' ')
}

function ExportSubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" isLoading={pending} disabled={pending}>
      {pending ? 'Generating...' : 'Generate archive'}
    </Button>
  )
}

function DeletionSubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant="destructive" isLoading={pending} disabled={pending}>
      {pending ? 'Submitting...' : 'Schedule deletion'}
    </Button>
  )
}

export default function PrivacyDashboard({ email, summary }: PrivacyDashboardProps) {
  const [exportState, exportAction] = useFormState(requestPrivacyExport, initialExportState)
  const [deletionState, deletionAction] = useFormState(submitDeletionRequest, initialDeletionState)

  const latestExport = summary?.latestExport ?? null
  const pendingDeletion = summary?.pendingDeletion ?? null

  const exportDownloadUrl = useMemo(() => {
    return exportState.downloadUrl ?? latestExport?.downloadUrl ?? null
  }, [exportState.downloadUrl, latestExport?.downloadUrl])

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Data export</CardTitle>
          <CardDescription>
            Compile a portable archive of your data. We send a download link to{' '}
            <span className="font-medium text-foreground">{email ?? 'your account email'}</span> when it is ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {latestExport ? (
            <div className="rounded-md border border-dashed p-4 text-sm">
              <p className="font-medium text-foreground">Last export</p>
              <dl className="mt-2 space-y-1 text-muted-foreground">
                <div>
                  <dt className="inline font-medium text-foreground">Status:</dt>{' '}
                  <dd className="inline capitalize">{normalizeStatusLabel(latestExport.status)}</dd>
                </div>
                {latestExport.requestedAt && (
                  <div>
                    <dt className="inline font-medium text-foreground">Requested:</dt>{' '}
                    <dd className="inline">{formatTimestamp(latestExport.requestedAt)}</dd>
                  </div>
                )}
                {latestExport.completedAt && (
                  <div>
                    <dt className="inline font-medium text-foreground">Completed:</dt>{' '}
                    <dd className="inline">{formatTimestamp(latestExport.completedAt)}</dd>
                  </div>
                )}
              </dl>
              {latestExport.downloadUrl && (
                <p className="mt-3">
                  <a
                    className="text-sm font-medium text-primary underline underline-offset-4"
                    href={latestExport.downloadUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Download previous archive
                  </a>
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              You haven&apos;t generated an export yet. Request one anytime to save your profile, bookings, and documents for your
              personal records.
            </p>
          )}
          <form action={exportAction} className="space-y-4">
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-foreground">Include in archive</legend>
              <label className="flex items-center gap-2 text-sm text-muted-foreground" htmlFor="includeDocuments">
                <input
                  className="h-4 w-4 rounded border border-border bg-background"
                  defaultChecked
                  id="includeDocuments"
                  name="includeDocuments"
                  type="checkbox"
                />
                Lease agreements & policy documents
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground" htmlFor="includeMessages">
                <input
                  className="h-4 w-4 rounded border border-border bg-background"
                  defaultChecked
                  id="includeMessages"
                  name="includeMessages"
                  type="checkbox"
                />
                Message board conversations
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground" htmlFor="includeRequests">
                <input
                  className="h-4 w-4 rounded border border-border bg-background"
                  id="includeRequests"
                  name="includeRequests"
                  type="checkbox"
                />
                Maintenance and amenity requests
              </label>
            </fieldset>
            {exportState.message && (
              <p
                className={`rounded-md border p-3 text-sm ${
                  exportState.status === 'error'
                    ? 'border-destructive/50 bg-destructive/10 text-destructive'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {exportState.message}
              </p>
            )}
            {exportDownloadUrl && (
              <p className="text-sm">
                <a
                  className="font-medium text-primary underline underline-offset-4"
                  href={exportDownloadUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Download the latest archive
                </a>
              </p>
            )}
            <CardFooter className="px-0">
              <ExportSubmitButton />
            </CardFooter>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Self-service deletion</CardTitle>
          <CardDescription>
            Remove your account and associated data once obligations and balances are resolved. You will receive confirmation at{' '}
            <span className="font-medium text-foreground">{email ?? 'your account email'}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingDeletion ? (
            <div className="rounded-md border border-dashed p-4 text-sm">
              <p className="font-medium text-foreground">Deletion status</p>
              <dl className="mt-2 space-y-1 text-muted-foreground">
                <div>
                  <dt className="inline font-medium text-foreground">Status:</dt>{' '}
                  <dd className="inline capitalize">{normalizeStatusLabel(pendingDeletion.status)}</dd>
                </div>
                {pendingDeletion.scheduledFor && (
                  <div>
                    <dt className="inline font-medium text-foreground">Scheduled for:</dt>{' '}
                    <dd className="inline">{formatTimestamp(pendingDeletion.scheduledFor)}</dd>
                  </div>
                )}
              </dl>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Deletions are irreversible. We recommend downloading an export first and ensuring rent or maintenance balances are
              settled.
            </p>
          )}
          <form action={deletionAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirmation">Confirmation phrase</Label>
              <Input id="confirmation" name="confirmation" placeholder="Type DELETE to continue" />
              <p className="text-xs text-muted-foreground">
                We only proceed when the phrase matches exactly. This keeps your roommates&apos; records safe from accidental deletions.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for leaving (optional)</Label>
              <Textarea id="reason" name="reason" placeholder="We appreciate any feedback you can share." />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground" htmlFor="exportBackup">
              <input
                className="h-4 w-4 rounded border border-border bg-background"
                defaultChecked
                id="exportBackup"
                name="exportBackup"
                type="checkbox"
              />
              Generate a fresh export before deletion begins
            </label>
            {deletionState.message && (
              <p
                className={`rounded-md border p-3 text-sm ${
                  deletionState.status === 'error'
                    ? 'border-destructive/50 bg-destructive/10 text-destructive'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                }`}
              >
                {deletionState.message}
              </p>
            )}
            <CardFooter className="px-0">
              <DeletionSubmitButton />
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
