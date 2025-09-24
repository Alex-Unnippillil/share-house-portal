'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState, useTransition } from 'react'

import { format, formatDistanceToNow, parseISO } from 'date-fns'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Globe2,
  RefreshCcw,
  ShieldAlert,
  Target,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

import {
  scheduleDomainRenewal,
  verifyCustomDomain,
  type DomainActionPayload,
} from '@/app/api/domains/actions'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import {
  type DomainCertificateEvent,
  type DomainWithEvents,
  parseDnsRecords,
} from '@/lib/data/domains'
import type { Json } from '@/lib/supabase'

interface DomainOverviewProps {
  domains: DomainWithEvents[]
}

const verificationBadge: Record<string, BadgeProps['variant']> = {
  pending: 'secondary',
  verified: 'complete',
  failed: 'destructive',
}

const certificateBadge: Record<string, BadgeProps['variant']> = {
  pending: 'secondary',
  active: 'complete',
  renewing: 'outline',
  failed: 'destructive',
  expired: 'destructive',
}

export function DomainOverview({ domains: initialDomains }: DomainOverviewProps) {
  const [domains, setDomains] = useState(initialDomains)
  const [pendingAction, setPendingAction] = useState<{
    id: string
    type: 'verify' | 'renew'
  } | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    setDomains(initialDomains)
  }, [initialDomains])

  const updateDomainInState = (payload: DomainActionPayload) => {
    setDomains((current) =>
      current.map((domain) => {
        if (domain.id !== payload.domainId) {
          return domain
        }

        return {
          ...domain,
          verification_status: payload.verificationStatus,
          certificate_status: payload.certificateStatus,
          certificate_expires_at: payload.certificateExpiresAt,
          renewal_scheduled_for: payload.renewalScheduledFor,
          dns_records: payload.dnsRecords as unknown as Json,
          metadata: mergeMetadata(domain.metadata, payload.fallback),
        }
      }),
    )
  }

  const handleVerify = (domainId: string) => {
    setPendingAction({ id: domainId, type: 'verify' })
    startTransition(async () => {
      const result = await verifyCustomDomain(domainId)
      setPendingAction(null)

      if (!result.success) {
        toast({
          title: 'Verification failed',
          description: result.error,
          variant: 'destructive',
        })
        return
      }

      toast({ title: 'Verification request sent', description: result.message })
      updateDomainInState(result.data)
      router.refresh()
    })
  }

  const handleRenewal = (domainId: string) => {
    setPendingAction({ id: domainId, type: 'renew' })
    startTransition(async () => {
      const result = await scheduleDomainRenewal(domainId)
      setPendingAction(null)

      if (!result.success) {
        toast({
          title: 'Could not schedule renewal',
          description: result.error,
          variant: 'destructive',
        })
        return
      }

      toast({ title: 'Renewal scheduled', description: result.message })
      updateDomainInState(result.data)
      router.refresh()
    })
  }

  const emptyState = !domains.length

  return (
    <div className="space-y-4">
      {emptyState ? (
        <Card>
          <CardHeader>
            <CardTitle>No custom domains yet</CardTitle>
            <CardDescription>
              Provision a domain to issue certificates for tenant portals and keep renewals automated.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        domains.map((domain) => (
          <DomainCard
            key={domain.id}
            domain={domain}
            onVerify={handleVerify}
            onRenew={handleRenewal}
            pendingAction={pendingAction}
            isPending={isPending}
          />
        ))
      )}
    </div>
  )
}

interface DomainCardProps {
  domain: DomainWithEvents
  onVerify: (id: string) => void
  onRenew: (id: string) => void
  pendingAction: { id: string; type: 'verify' | 'renew' } | null
  isPending: boolean
}

function DomainCard({ domain, onVerify, onRenew, pendingAction, isPending }: DomainCardProps) {
  const dnsRecords = useMemo(() => parseDnsRecords(domain.dns_records), [domain.dns_records])
  const fallbackInfo = extractFallback(domain.metadata)

  return (
    <Card className="border-border/60">
      <CardHeader className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="border-muted-foreground/40 text-sm">
            <Globe2 className="mr-2 size-4" />
            {domain.domain}
          </Badge>
          <Badge variant={verificationBadge[domain.verification_status] ?? 'secondary'}>
            {domain.verification_status}
          </Badge>
          <Badge variant={certificateBadge[domain.certificate_status] ?? 'secondary'}>
            Certificate: {domain.certificate_status}
          </Badge>
          {fallbackInfo.fallback ? (
            <Badge variant="outline" className="border-dashed">
              <AlertTriangle className="mr-1 size-3" /> Manual DNS required
            </Badge>
          ) : null}
        </div>
        <CardTitle className="text-xl font-semibold">{domain.domain}</CardTitle>
        <CardDescription>
          Next renewal window{' '}
          {domain.renewal_scheduled_for
            ? formatRelative(domain.renewal_scheduled_for)
            : 'not scheduled yet.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="space-y-3">
            <SectionHeading icon={<TargetIcon />} title="DNS records" />
            {dnsRecords.length ? (
              <div className="overflow-hidden rounded-md border">
                <div className="grid grid-cols-4 gap-2 border-b bg-muted/60 p-2 text-xs font-medium uppercase">
                  <span>Host</span>
                  <span>Type</span>
                  <span>Target</span>
                  <span>TTL</span>
                </div>
                {dnsRecords.map((record) => (
                  <div
                    key={`${record.type}-${record.host ?? '@'}-${record.value}`}
                    className="grid grid-cols-4 gap-2 border-b p-3 text-sm last:border-b-0"
                  >
                    <span className="font-medium">{record.host ?? '@'}</span>
                    <span>{record.type}</span>
                    <span className="truncate" title={record.value}>
                      {record.value}
                    </span>
                    <span>{record.ttl ? `${record.ttl}s` : 'Auto'}</span>
                    {record.description ? (
                      <p className="col-span-4 text-xs text-muted-foreground">
                        {record.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                DNS guidance will appear once provisioning completes.
              </p>
            )}
          </div>
          <div className="space-y-3">
            <SectionHeading icon={<CalendarClock className="size-4" />} title="Certificate status" />
            <div className="rounded-md border p-4 text-sm">
              <dl className="space-y-2">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Issued</dt>
                  <dd>{formatDate(domain.certificate_issued_at)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Expires</dt>
                  <dd>{formatDate(domain.certificate_expires_at)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Renewal scheduled</dt>
                  <dd>{formatDate(domain.renewal_scheduled_for)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Last checked</dt>
                  <dd>{formatDate(domain.last_checked_at)}</dd>
                </div>
              </dl>
              {fallbackInfo.reason ? (
                <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldAlert className="size-3" /> {fallbackInfo.reason}
                </p>
              ) : null}
              {domain.last_error ? (
                <p className="mt-2 text-xs text-destructive">{domain.last_error}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onVerify(domain.id)}
                disabled={isPending && pendingAction?.id === domain.id}
              >
                {isPending && pendingAction?.id === domain.id && pendingAction?.type === 'verify' ? (
                  <Loader label="Verifying..." />
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 size-4" /> Verify DNS
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onRenew(domain.id)}
                disabled={isPending && pendingAction?.id === domain.id}
              >
                {isPending && pendingAction?.id === domain.id && pendingAction?.type === 'renew' ? (
                  <Loader label="Scheduling..." />
                ) : (
                  <>
                    <RefreshCcw className="mr-2 size-4" /> Schedule renewal
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <SectionHeading icon={<TimelineIcon />} title="Admin activity" />
          {domain.events.length ? (
            <ul className="space-y-2">
              {domain.events.slice(0, 5).map((event) => (
                <li key={event.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDate(event.created_at)}</span>
                    <Badge variant={eventStatusVariant(event.status)}>{event.event_type}</Badge>
                  </div>
                  <p className="mt-1">{event.message}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Provisioning activity will appear here once actions are logged.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function mergeMetadata(metadata: Json | null, fallback: boolean): Json {
  const base =
    metadata && typeof metadata === 'object'
      ? { ...(metadata as Record<string, unknown>) }
      : {}
  return {
    ...base,
    fallback,
  }
}

function extractFallback(metadata: Json | null) {
  if (!metadata || typeof metadata !== 'object') {
    return { fallback: false, reason: null as string | null }
  }
  const typed = metadata as Record<string, unknown>
  const fallback = Boolean(typed.fallback)
  const reason = typeof typed.fallbackReason === 'string' ? typed.fallbackReason : null
  return { fallback, reason }
}

function formatDate(value: string | null) {
  if (!value) {
    return '—'
  }
  try {
    const parsed = parseISO(value)
    if (Number.isNaN(parsed.getTime())) {
      return '—'
    }
    return format(parsed, 'MMM d, yyyy')
  } catch {
    return '—'
  }
}

function formatRelative(value: string | null) {
  if (!value) {
    return 'not scheduled'
  }
  try {
    const parsed = parseISO(value)
    if (Number.isNaN(parsed.getTime())) {
      return 'not scheduled'
    }
    return formatDistanceToNow(parsed, { addSuffix: true })
  } catch {
    return 'not scheduled'
  }
}

function eventStatusVariant(status: DomainCertificateEvent['status']) {
  switch (status) {
    case 'success':
      return 'complete'
    case 'warning':
      return 'outline'
    case 'error':
      return 'destructive'
    default:
      return 'secondary'
  }
}

function Loader({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-2">
      <RefreshCcw className="size-4 animate-spin" />
      {label}
    </span>
  )
}

function SectionHeading({
  icon,
  title,
}: {
  icon: ReactNode
  title: string
}) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
      {icon}
      <span>{title}</span>
    </div>
  )
}

function TargetIcon() {
  return <Target className="size-4" />
}

function TimelineIcon() {
  return <CheckCircle2 className="size-4" />
}
