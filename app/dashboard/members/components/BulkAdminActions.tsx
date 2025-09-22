"use client"

import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react'
import { Loader2, Megaphone, Users2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'

import {
  cancelAdminJob,
  enqueueBulkNotification,
  enqueueBulkStatusUpdate,
  pollAdminJobs,
  retryAdminJob,
} from '../actions/admin-jobs'
import type {
  AdminJobDTO,
  AdminJobStatus,
  AdminJobType,
  BulkNotificationRequest,
  BulkStatusUpdateRequest,
  ProfileRoleFilter,
  ProfileStatus,
  ProfileStatusFilter,
} from '@/types/admin-jobs'

const ROLE_OPTIONS: Array<{ label: string; value: ProfileRoleFilter }> = [
  { label: 'All roles', value: 'all' },
  { label: 'Tenants', value: 'tenant' },
  { label: 'Roommates', value: 'roommate' },
  { label: 'Property managers', value: 'property_manager' },
  { label: 'Admins', value: 'admin' },
  { label: 'Standard users', value: 'user' },
]

const STATUS_OPTIONS: ProfileStatus[] = ['active', 'inactive', 'invited', 'suspended']
const NOTIFICATION_TYPES: Array<{ label: string; value: BulkNotificationRequest['notificationType'] }> = [
  { label: 'Info', value: 'info' },
  { label: 'Success', value: 'success' },
  { label: 'Warning', value: 'warning' },
  { label: 'Error', value: 'error' },
]

const STATUS_BADGE_VARIANT: Record<AdminJobStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  queued: 'outline',
  running: 'secondary',
  completed: 'default',
  failed: 'destructive',
  cancelled: 'destructive',
}

type BulkAdminActionsProps = {
  initialJobs: AdminJobDTO[]
}

type ActionFormState = {
  actionType: AdminJobType
  role: ProfileRoleFilter
  currentStatus: ProfileStatusFilter
  nextStatus: ProfileStatus
  sendNotification: boolean
  notificationTitle: string
  notificationMessage: string
  notificationType: BulkNotificationRequest['notificationType']
  actionUrl: string
}

export function BulkAdminActions({ initialJobs }: BulkAdminActionsProps) {
  const [jobs, setJobs] = useState<AdminJobDTO[]>(() => sortJobs(initialJobs))
  const [formState, setFormState] = useState<ActionFormState>({
    actionType: 'status_update',
    role: 'all',
    currentStatus: 'all',
    nextStatus: 'active',
    sendNotification: true,
    notificationTitle: 'Status update',
    notificationMessage:
      'Hi {name}, your account status has been updated to {status}.',
    notificationType: 'info',
    actionUrl: '/dashboard',
  })
  const [isPolling, setIsPolling] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const activeJobIds = useMemo(
    () =>
      jobs
        .filter((job) => job.status === 'queued' || job.status === 'running')
        .map((job) => job.id),
    [jobs]
  )

  useEffect(() => {
    if (activeJobIds.length === 0) {
      return
    }

    let cancelled = false

    const tick = async () => {
      setIsPolling(true)
      try {
        const updates = await pollAdminJobs(activeJobIds)
        if (!cancelled && updates.length > 0) {
          setJobs((prev) => mergeJobUpdates(prev, updates))
        }
      } catch (error) {
        console.error('Failed to poll admin jobs', error)
      } finally {
        if (!cancelled) {
          setIsPolling(false)
        }
      }
    }

    void tick()
    const interval = setInterval(() => {
      void tick()
    }, 4000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [activeJobIds])

  const handleSubmit = () => {
    if (formState.actionType === 'status_update') {
      const payload: BulkStatusUpdateRequest = {
        role: formState.role,
        currentStatus: formState.currentStatus,
        nextStatus: formState.nextStatus,
        sendNotification: formState.sendNotification,
        notificationTitle: formState.notificationTitle,
        notificationMessage: formState.notificationMessage,
        notificationType: formState.notificationType,
        actionUrl: formState.actionUrl,
      }

      startTransition(async () => {
        const response = await enqueueBulkStatusUpdate(payload)
        if (response.error) {
          toast({
            title: 'Unable to queue status update',
            description: response.error,
            variant: 'destructive',
          })
          return
        }

        if (response.job) {
          setJobs((prev) => mergeJobUpdates(prev, [response.job]))
          toast({
            title: 'Bulk status update queued',
            description: `${response.job.payload.summary?.count ?? response.job.totalTasks} member(s) will be processed.`,
          })
        }
      })
    } else {
      const payload: BulkNotificationRequest = {
        role: formState.role,
        currentStatus: formState.currentStatus,
        notificationTitle: formState.notificationTitle,
        notificationMessage: formState.notificationMessage,
        notificationType: formState.notificationType,
        actionUrl: formState.actionUrl,
      }

      startTransition(async () => {
        const response = await enqueueBulkNotification(payload)
        if (response.error) {
          toast({
            title: 'Unable to queue notification',
            description: response.error,
            variant: 'destructive',
          })
          return
        }

        if (response.job) {
          setJobs((prev) => mergeJobUpdates(prev, [response.job]))
          toast({
            title: 'Bulk notification queued',
            description: `${response.job.payload.summary?.count ?? response.job.totalTasks} member(s) will be notified.`,
          })
        }
      })
    }
  }

  const handleCancel = (jobId: string) => {
    startTransition(async () => {
      const response = await cancelAdminJob(jobId)
      if (response.error) {
        toast({
          title: 'Unable to cancel job',
          description: response.error,
          variant: 'destructive',
        })
        return
      }

      if (response.job) {
        setJobs((prev) => mergeJobUpdates(prev, [response.job]))
        toast({
          title: 'Job cancelled',
          description: 'The job will not process additional members.',
        })
      }
    })
  }

  const handleRetry = (jobId: string) => {
    startTransition(async () => {
      const response = await retryAdminJob(jobId)
      if (response.error) {
        toast({
          title: 'Unable to retry job',
          description: response.error,
          variant: 'destructive',
        })
        return
      }

      if (response.job) {
        setJobs((prev) => mergeJobUpdates(prev, [response.job]))
        toast({
          title: 'Job relaunched',
          description: `${response.job.payload.summary?.count ?? response.job.totalTasks} member(s) re-queued for processing.`,
        })
      }
    })
  }

  const disableNotificationFields =
    formState.actionType === 'status_update' && !formState.sendNotification

  const isBusy = isPending || isPolling

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-muted">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Bulk admin actions</CardTitle>
              <CardDescription>
                Queue large member updates without blocking the dashboard. Jobs run
                in Supabase and report progress here.
              </CardDescription>
            </div>
            {isBusy ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs
            value={formState.actionType}
            onValueChange={(value) =>
              setFormState((prev) => ({
                ...prev,
                actionType: value as ActionFormState['actionType'],
              }))
            }
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="status_update" className="flex items-center gap-2">
                <Users2 className="size-4" /> Status update
              </TabsTrigger>
              <TabsTrigger value="notification" className="flex items-center gap-2">
                <Megaphone className="size-4" /> Notification blast
              </TabsTrigger>
            </TabsList>

            <TabsContent value="status_update" className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="role">Role filter</Label>
                  <Select
                    value={formState.role}
                    onValueChange={(value) =>
                      setFormState((prev) => ({
                        ...prev,
                        role: value as ProfileRoleFilter,
                      }))
                    }
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="All roles" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current-status">Current status filter</Label>
                  <Select
                    value={formState.currentStatus}
                    onValueChange={(value) =>
                      setFormState((prev) => ({
                        ...prev,
                        currentStatus: value as ProfileStatusFilter,
                      }))
                    }
                  >
                    <SelectTrigger id="current-status">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="next-status">Set new status</Label>
                  <Select
                    value={formState.nextStatus}
                    onValueChange={(value) =>
                      setFormState((prev) => ({
                        ...prev,
                        nextStatus: value as ProfileStatus,
                      }))
                    }
                  >
                    <SelectTrigger id="next-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-md border border-muted p-3">
                  <div>
                    <Label htmlFor="send-notification" className="text-sm font-medium">
                      Send in-app notifications
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Notify members as soon as their status changes.
                    </p>
                  </div>
                  <Switch
                    id="send-notification"
                    checked={formState.sendNotification}
                    onCheckedChange={(checked) =>
                      setFormState((prev) => ({
                        ...prev,
                        sendNotification: checked,
                      }))
                    }
                  />
                </div>
              </div>

              <Separator />

              <NotificationFields
                formState={formState}
                setFormState={setFormState}
                disabled={disableNotificationFields}
              />
            </TabsContent>

            <TabsContent value="notification" className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="role-notification">Role filter</Label>
                  <Select
                    value={formState.role}
                    onValueChange={(value) =>
                      setFormState((prev) => ({
                        ...prev,
                        role: value as ProfileRoleFilter,
                      }))
                    }
                  >
                    <SelectTrigger id="role-notification">
                      <SelectValue placeholder="All roles" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current-status-notification">Status filter</Label>
                  <Select
                    value={formState.currentStatus}
                    onValueChange={(value) =>
                      setFormState((prev) => ({
                        ...prev,
                        currentStatus: value as ProfileStatusFilter,
                      }))
                    }
                  >
                    <SelectTrigger id="current-status-notification">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <NotificationFields
                formState={formState}
                setFormState={setFormState}
                disabled={false}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Queue job
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-muted">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Job queue</CardTitle>
              <CardDescription>
                Monitor queued bulk operations and manage retries or cancellation.
              </CardDescription>
            </div>
            <Badge variant={isPolling ? 'secondary' : 'outline'}>
              {isPolling ? 'Refreshing…' : 'Auto-refresh'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {jobs.length === 0 ? (
            <div className="rounded-md border border-dashed border-muted-foreground/40 p-6 text-center text-sm text-muted-foreground">
              No jobs have been queued yet. Use the form to schedule your first bulk
              operation.
            </div>
          ) : (
            jobs.map((job) => {
              const progress = job.totalTasks === 0
                ? 100
                : Math.round((job.processedTasks / job.totalTasks) * 100)
              const failureCount = job.result?.summary.failures ?? 0
              const canCancel = job.status === 'queued' || job.status === 'running'
              const canRetry =
                job.status === 'failed' ||
                job.status === 'cancelled' ||
                (job.status === 'completed' && failureCount > 0)

              return (
                <Card key={job.id} className="border border-muted">
                  <CardHeader className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-1">
                        <CardTitle className="text-base font-semibold">
                          {job.type === 'status_update'
                            ? 'Status update'
                            : 'Notification broadcast'}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          Requested {new Date(job.createdAt).toLocaleString()} • Updated{' '}
                          {new Date(job.updatedAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <Badge variant={STATUS_BADGE_VARIANT[job.status]}>
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <Progress value={progress} />
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          {job.processedTasks}/{job.totalTasks} processed
                        </span>
                        <span>
                          Targeted {job.payload.summary?.count ?? job.totalTasks} members
                        </span>
                        {failureCount > 0 ? (
                          <span className="font-medium text-destructive">
                            {failureCount} failure{failureCount === 1 ? '' : 's'}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      <p className="font-medium">Filters</p>
                      <p className="text-xs text-muted-foreground">
                        Role: {formatRole(job.payload.filters.role)} • Status filter:{' '}
                        {formatStatus(job.payload.filters.currentStatus)}
                      </p>
                    </div>
                    {job.error ? (
                      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                        {job.error}
                      </div>
                    ) : null}
                  </CardContent>
                  <CardFooter className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground">
                      ID: {job.id.slice(0, 8)}…
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {canCancel ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancel(job.id)}
                          disabled={isPending}
                        >
                          Cancel
                        </Button>
                      ) : null}
                      {canRetry ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(job.id)}
                          disabled={isPending}
                        >
                          Retry
                        </Button>
                      ) : null}
                    </div>
                  </CardFooter>
                </Card>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}

type NotificationFieldsProps = {
  formState: ActionFormState
  setFormState: Dispatch<SetStateAction<ActionFormState>>
  disabled: boolean
}

function NotificationFields({ formState, setFormState, disabled }: NotificationFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="notification-title">Notification title</Label>
          <Input
            id="notification-title"
            value={formState.notificationTitle}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                notificationTitle: event.target.value,
              }))
            }
            disabled={disabled}
            placeholder="Status update"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notification-type">Notification tone</Label>
          <Select
            value={formState.notificationType}
            onValueChange={(value) =>
              setFormState((prev) => ({
                ...prev,
                notificationType: value as BulkNotificationRequest['notificationType'],
              }))
            }
            disabled={disabled}
          >
            <SelectTrigger id="notification-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NOTIFICATION_TYPES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notification-message">Message</Label>
        <Textarea
          id="notification-message"
          value={formState.notificationMessage}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              notificationMessage: event.target.value,
            }))
          }
          disabled={disabled}
          rows={4}
          placeholder="Hi {name}, ..."
        />
        <p className="text-xs text-muted-foreground">
          Use placeholders like {'{name}'} and {'{status}'} to personalise the copy.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notification-link">Call-to-action URL</Label>
        <Input
          id="notification-link"
          value={formState.actionUrl}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              actionUrl: event.target.value,
            }))
          }
          disabled={disabled}
          placeholder="/dashboard"
        />
      </div>
    </div>
  )
}

function mergeJobUpdates(existing: AdminJobDTO[], updates: AdminJobDTO[]): AdminJobDTO[] {
  if (updates.length === 0) {
    return sortJobs(existing)
  }

  const jobMap = new Map(existing.map((job) => [job.id, job]))

  for (const update of updates) {
    const current = jobMap.get(update.id)
    jobMap.set(update.id, current ? { ...current, ...update } : update)
  }

  return sortJobs(Array.from(jobMap.values()))
}

function sortJobs(jobs: AdminJobDTO[]): AdminJobDTO[] {
  return [...jobs].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime()
    const bTime = new Date(b.createdAt).getTime()
    return bTime - aTime
  })
}

function formatRole(role: ProfileRoleFilter): string {
  if (role === 'all') {
    return 'All roles'
  }

  return role
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function formatStatus(status: ProfileStatusFilter): string {
  if (status === 'all') {
    return 'All statuses'
  }

  return status.charAt(0).toUpperCase() + status.slice(1)
}
