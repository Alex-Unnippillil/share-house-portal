'use client'

import { useEffect, useState, useTransition } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  provisionCustomDomain,
  type DomainActionPayload,
  type NormalizedDnsRecord,
} from '@/app/api/domains/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/use-toast'

const formSchema = z.object({
  domain: z
    .string()
    .min(3, { message: 'Enter a valid domain (for example tenant.roomsily.com).' })
    .max(255, { message: 'Domain names must be fewer than 255 characters.' })
    .regex(/^[a-z0-9.-]+$/i, {
      message: 'Domain names may only include letters, numbers, dots, and hyphens.',
    }),
  projectId: z
    .string()
    .max(255, { message: 'Project identifiers must be fewer than 255 characters.' })
    .optional(),
})

type DomainFormValues = z.infer<typeof formSchema>

interface DomainOnboardingFormProps {
  defaultProjectId?: string | null
}

export function DomainOnboardingForm({ defaultProjectId }: DomainOnboardingFormProps) {
  const [isPending, startTransition] = useTransition()
  const [lastResult, setLastResult] = useState<DomainActionPayload | null>(null)

  const form = useForm<DomainFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      domain: '',
      projectId: defaultProjectId ?? '',
    },
  })

  useEffect(() => {
    if (defaultProjectId) {
      form.setValue('projectId', defaultProjectId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultProjectId])

  const handleSubmit = (values: DomainFormValues) => {
    startTransition(async () => {
      const result = await provisionCustomDomain({
        domain: values.domain.trim(),
        projectId: values.projectId?.trim() || undefined,
      })

      if (!result.success) {
        toast({
          title: 'Unable to save domain',
          description: result.error,
          variant: 'destructive',
        })
        return
      }

      setLastResult(result.data)

      toast({
        title: 'Domain captured',
        description: result.message,
      })

      form.reset({
        domain: '',
        projectId: values.projectId,
      })
    })
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Connect a custom domain</CardTitle>
        <CardDescription>
          Add a tenant-friendly hostname and Roomsily will guide you through DNS and certificate
          automation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="domain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domain name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="tenant.roomsily.com"
                      autoComplete="off"
                      {...field}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    Use the exact host that tenants will visit. Subdomains are supported and recommended.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vercel project ID (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="prj_..."
                      autoComplete="off"
                      {...field}
                      value={field.value ?? ''}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    If provided, Roomsily will call the Vercel Domains API to provision certificates for you.
                    Leave blank to record DNS targets manually.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Saving domain
                </span>
              ) : (
                'Save domain'
              )}
            </Button>
          </form>
        </Form>

        {lastResult ? (
          <div className="space-y-4 rounded-lg border bg-muted/40 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="size-4" />
                Verification status
              </div>
              <Badge variant={lastResult.verificationStatus === 'verified' ? 'complete' : 'secondary'}>
                {lastResult.verificationStatus}
              </Badge>
              <Badge variant={lastResult.certificateStatus === 'active' ? 'complete' : 'outline'}>
                Cert: {lastResult.certificateStatus}
              </Badge>
              {lastResult.fallback ? (
                <Badge variant="outline" className="border-dashed">
                  Vercel automation pending
                </Badge>
              ) : null}
            </div>
            <div className="space-y-2 text-sm">
              <p>
                Add the DNS records below to your domain provider, then return to this page and run a
                verification check.
              </p>
              <DnsRecordList records={lastResult.dnsRecords} />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

interface DnsRecordListProps {
  records: NormalizedDnsRecord[]
}

function DnsRecordList({ records }: DnsRecordListProps) {
  if (!records.length) {
    return (
      <p className="text-sm text-muted-foreground">
        DNS instructions will appear after provisioning completes.
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="grid grid-cols-4 gap-2 border-b bg-muted/60 p-2 text-xs font-medium uppercase">
        <span>Host</span>
        <span>Type</span>
        <span>Target</span>
        <span>TTL</span>
      </div>
      {records.map((record) => (
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
            <p className="col-span-4 text-xs text-muted-foreground">{record.description}</p>
          ) : null}
        </div>
      ))}
    </div>
  )
}
