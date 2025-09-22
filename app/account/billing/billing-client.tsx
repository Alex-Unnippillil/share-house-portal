'use client'

import { useState, useTransition } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import type { Database } from '@/lib/supabase'
import { cn } from '@/lib/utils'

import { disableAutoPay } from './actions'

type Member = Database['public']['Tables']['members']['Row']
type LedgerEntry = Database['public']['Tables']['rent_ledger_entries']['Row']

type BillingClientProps = {
  member: Member
  ledgerEntries: LedgerEntry[]
  userEmail: string | null
}

const enrollmentSchema = z.object({
  accountHolderName: z.string().min(1, 'Account holder name is required.'),
  email: z.string().email('Provide a valid email address.'),
  institutionNumber: z
    .string()
    .min(3, 'Institution number must be 3 digits.')
    .max(3, 'Institution number must be 3 digits.')
    .regex(/^[0-9]{3}$/, 'Institution number must be numeric.'),
  transitNumber: z
    .string()
    .min(5, 'Transit number must be 5 digits.')
    .max(5, 'Transit number must be 5 digits.')
    .regex(/^[0-9]{5}$/, 'Transit number must be numeric.'),
  accountNumber: z
    .string()
    .min(7, 'Account number must be at least 7 digits.')
    .max(17, 'Account number must be less than 17 digits.')
    .regex(/^[0-9]+$/, 'Account number must be numeric.'),
})

type EnrollmentFormValues = z.infer<typeof enrollmentSchema>

const padStatusCopy: Record<Member['pad_status'], { label: string; description: string }> = {
  active: {
    label: 'Active',
    description: 'Mandate is active and payments will process automatically.',
  },
  pending: {
    label: 'Pending verification',
    description:
      'Stripe is verifying your bank account. We will notify you if additional actions are required.',
  },
  action_required: {
    label: 'Action required',
    description:
      'The most recent debit failed. Update your mandate details or contact support to resume auto-pay.',
  },
  not_enrolled: {
    label: 'Not enrolled',
    description: 'Enroll in PAD auto-pay to enable automatic rent debits each month.',
  },
}

const padStatusStyles: Record<Member['pad_status'], string> = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  action_required: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200',
  not_enrolled: 'bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-200',
}

const ledgerStatusStyles: Record<LedgerEntry['status'], string> = {
  pending: 'bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-200',
  processing: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200',
}

const ledgerStatusLabels: Record<LedgerEntry['status'], string> = {
  pending: 'Pending',
  processing: 'Processing',
  paid: 'Paid',
  failed: 'Failed',
}

const formatCurrency = (amount: number, currency: string) => {
  const isoCurrency = (currency || 'cad').toUpperCase()

  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: isoCurrency,
  }).format(amount / 100)
}

const formatDate = (value: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('en-CA', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

export default function BillingClient({ member, ledgerEntries, userEmail }: BillingClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [disablePending, startDisable] = useTransition()

  const form = useForm<EnrollmentFormValues>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      accountHolderName: '',
      email: userEmail ?? '',
      institutionNumber: '',
      transitNumber: '',
      accountNumber: '',
    },
  })

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

  const handleDisable = () => {
    startDisable(async () => {
      const result = await disableAutoPay()

      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Unable to disable auto-pay',
          description: result.error ?? 'Please try again or contact support.',
        })
        return
      }

      toast({
        title: 'Auto-pay disabled',
        description: 'Future rent invoices will require manual payment until you re-enroll.',
      })
      router.refresh()
    })
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (!publishableKey) {
      toast({
        variant: 'destructive',
        title: 'Stripe publishable key missing',
        description: 'Contact the administrator to configure Stripe before enrolling in PAD.',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const createResponse = await fetch('/api/billing/create-setup-intent', {
        method: 'POST',
      })

      if (!createResponse.ok) {
        const errorPayload = await createResponse.json().catch(() => ({}))
        throw new Error(errorPayload.error ?? 'Unable to create setup intent.')
      }

      const setupPayload = await createResponse.json()

      if (!setupPayload?.clientSecret) {
        throw new Error('Stripe did not return a client secret.')
      }

      const stripe = await loadStripe(publishableKey)

      if (!stripe) {
        throw new Error('Unable to initialize Stripe.js client.')
      }

      const confirmation = await stripe.confirmAcssDebitSetup(setupPayload.clientSecret, {
        payment_method: {
          billing_details: {
            name: values.accountHolderName,
            email: values.email,
          },
          acss_debit: {
            institution_number: values.institutionNumber,
            transit_number: values.transitNumber,
            account_number: values.accountNumber,
          },
        },
        payment_method_options: {
          acss_debit: {
            currency: 'cad',
          },
        },
      })

      if (confirmation.error) {
        throw new Error(confirmation.error.message ?? 'The bank account could not be verified.')
      }

      const confirmedSetupIntentId = confirmation.setupIntent?.id ?? setupPayload.setupIntentId

      if (!confirmedSetupIntentId) {
        throw new Error('Unable to confirm setup intent identifier.')
      }

      const finalizeResponse = await fetch('/api/billing/create-setup-intent', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ setupIntentId: confirmedSetupIntentId }),
      })

      if (!finalizeResponse.ok) {
        const errorPayload = await finalizeResponse.json().catch(() => ({}))
        throw new Error(errorPayload.error ?? 'Unable to finalize PAD enrollment.')
      }

      const finalizePayload = await finalizeResponse.json()

      toast({
        title: 'PAD enrollment complete',
        description: finalizePayload.mandateReference
          ? `Mandate reference ${finalizePayload.mandateReference} is now active.`
          : 'Your bank account is verified for auto-pay.',
      })

      form.reset({
        accountHolderName: '',
        email: userEmail ?? '',
        institutionNumber: '',
        transitNumber: '',
        accountNumber: '',
      })
      setDialogOpen(false)
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error enrolling in PAD.'
      toast({
        variant: 'destructive',
        title: 'Unable to enroll in PAD',
        description: message,
      })
    } finally {
      setIsSubmitting(false)
    }
  })

  const isActive = member.auto_pay_enabled && member.pad_status === 'active'
  const hasMandate = Boolean(member.pad_mandate_id)

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <CardTitle>Auto-pay enrollment</CardTitle>
            <CardDescription>{padStatusCopy[member.pad_status].description}</CardDescription>
          </div>
          <Badge className={cn('self-start text-xs font-medium', padStatusStyles[member.pad_status])}>
            {padStatusCopy[member.pad_status].label}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Mandate status</p>
              <p className="text-base font-semibold">
                {isActive ? 'Auto-pay enabled' : hasMandate ? 'Awaiting processing' : 'Not enrolled'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Mandate reference</p>
              <p className="font-mono text-base">
                {member.pad_mandate_reference ?? member.pad_mandate_id ?? '—'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Last updated</p>
              <p>{formatDate(member.updated_at)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Auto-pay preference</p>
              <p>{member.auto_pay_enabled ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>
          {member.pad_last_error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <p className="font-semibold">Most recent error</p>
              <p className="mt-1 leading-relaxed">{member.pad_last_error}</p>
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={() => router.refresh()}
              variant="ghost"
              className="px-0 text-sm text-muted-foreground hover:text-foreground"
            >
              Refresh status
            </Button>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            {isActive ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleDisable}
                disabled={disablePending}
              >
                {disablePending ? 'Disabling…' : 'Disable auto-pay'}
              </Button>
            ) : null}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant={isActive ? 'secondary' : 'default'}>
                  {isActive ? 'Update bank details' : 'Enroll in PAD auto-pay'}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Verify bank account</DialogTitle>
                  <DialogDescription>
                    Provide your Canadian banking details to authorize pre-authorized debits through Stripe.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={onSubmit} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="accountHolderName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account holder name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Jordan Smith" autoComplete="name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="you@example.com" autoComplete="email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Separator />
                    <div className="grid gap-4 sm:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="institutionNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Institution #</FormLabel>
                            <FormControl>
                              <Input {...field} inputMode="numeric" maxLength={3} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="transitNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Transit #</FormLabel>
                            <FormControl>
                              <Input {...field} inputMode="numeric" maxLength={5} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="accountNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account #</FormLabel>
                            <FormControl>
                              <Input {...field} inputMode="numeric" maxLength={17} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting…' : 'Authorize PAD'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Rent ledger</CardTitle>
            <CardDescription>Upcoming and historical debits created for your unit.</CardDescription>
          </div>
          <Button type="button" variant="ghost" onClick={() => router.refresh()} className="px-0 text-sm text-muted-foreground hover:text-foreground">
            Refresh ledger
          </Button>
        </CardHeader>
        <CardContent>
          {ledgerEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No ledger entries yet. Once your property manager schedules rent invoices they will appear here with status updates.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">Due date</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                    <th className="px-4 py-3 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {ledgerEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3 align-top">{formatDate(entry.due_date)}</td>
                      <td className="px-4 py-3 align-top font-medium">
                        {formatCurrency(entry.amount, entry.currency)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Badge className={cn('text-xs font-medium', ledgerStatusStyles[entry.status])}>
                          {ledgerStatusLabels[entry.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 align-top">{formatDate(entry.updated_at ?? entry.processed_at)}</td>
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1">
                          {entry.failure_reason ? (
                            <p className="text-xs text-destructive">{entry.failure_reason}</p>
                          ) : null}
                          {entry.payment_intent_id ? (
                            <p className="text-xs text-muted-foreground">
                              PI: <span className="font-mono">{entry.payment_intent_id}</span>
                            </p>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
