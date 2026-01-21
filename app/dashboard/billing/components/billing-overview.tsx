"use client"

import { useMemo, useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { Info, Sparkles } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { formatCurrency } from "@/lib/payments/currency"
import { CouponValidationResult } from "@/lib/payments/coupons"
import { evaluateTrialStatus } from "@/lib/payments/trials"
import { cn } from "@/lib/utils"

import type { BillingOverview } from "../data"

const formSchema = z.object({
  planId: z.string().min(1, "Select a plan"),
  autopayEnabled: z.boolean().default(true),
  autopayDay: z
    .number()
    .int()
    .min(1, "Autopay day must be between 1 and 28")
    .max(28, "Autopay day must be between 1 and 28"),
  commitmentMonths: z
    .number()
    .int()
    .min(1, "Commitment must be at least one month")
    .max(36, "Commitment cannot exceed 36 months"),
  tenantStatus: z.enum(["new", "existing"]),
  couponCode: z
    .string()
    .trim()
    .max(64, "Coupon code is too long")
    .optional()
    .transform((value) => value ?? ""),
})

type FormValues = z.infer<typeof formSchema>

type BillingOverviewSectionProps = {
  overview: BillingOverview
}

export function BillingOverviewSection({ overview }: BillingOverviewSectionProps) {
  const [couponResult, setCouponResult] = useState<CouponValidationResult | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const trialStatus = useMemo(() => {
    return evaluateTrialStatus(overview.trial, {
      now: new Date(),
      gracePeriodDays: overview.trial.gracePeriodDays,
      pendingExtensionDays: couponResult?.trialExtensionDays ?? 0,
    })
  }, [overview.trial, couponResult])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      planId: overview.currentPlanId,
      autopayEnabled: overview.autopayEnabled,
      autopayDay: overview.autopayDay,
      commitmentMonths: overview.commitmentMonths,
      tenantStatus: overview.trial.convertedAt ? "existing" : "new",
      couponCode: "",
    },
  })

  async function handleSubmit(values: FormValues) {
    setStatusMessage(null)

    const couponCode = values.couponCode?.trim()

    if (!couponCode) {
      setCouponResult(null)
      setStatusMessage("Billing preferences saved")
      return
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/billing/coupons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: couponCode,
            planId: values.planId,
            commitmentMonths: values.commitmentMonths,
            tenantStatus: values.tenantStatus,
            isTrialActive: !overview.trial.convertedAt && !overview.trial.cancelledAt,
          }),
        })

        const data: CouponValidationResult = await response.json()

        if (!response.ok || !data.valid) {
          form.setError("couponCode", {
            type: "manual",
            message: data.message || "Unable to apply coupon",
          })
          setCouponResult(data)
          setStatusMessage(null)
          return
        }

        setCouponResult(data)
        setStatusMessage(`Coupon ${data.code} applied to ${values.planId}`)
      } catch (error) {
        console.error("Failed to validate coupon", error)
        form.setError("couponCode", {
          type: "manual",
          message: "Unable to validate coupon code",
        })
        setCouponResult(null)
      }
    })
  }

  const selectedPlan = overview.availablePlans.find(
    (plan) => plan.id === form.watch("planId")
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center justify-between gap-2">
            Update plan & coupon
            {selectedPlan?.recommended ? (
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="size-3" /> Recommended
              </Badge>
            ) : null}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose your plan preferences, toggle autopay, and apply coupon codes shared by your property manager.
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="planId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {overview.availablePlans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              <div className="flex flex-col text-start">
                                <span className="font-medium">{plan.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatCurrency(plan.price, plan.currency)} / {plan.interval}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        See plan features below once selected.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="commitmentMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commitment length</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={String(field.value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select commitment" />
                        </SelectTrigger>
                        <SelectContent>
                          {[3, 6, 12, 18, 24, 36].map((months) => (
                            <SelectItem key={months} value={String(months)}>
                              {months} months
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Some coupons require a minimum commitment length.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="tenantStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tenant status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New roommate</SelectItem>
                          <SelectItem value="existing">Existing roommate</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Some coupons are limited to first-time roommates.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="autopayEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-col justify-between gap-2 rounded-md border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <FormLabel className="mb-1">Autopay</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Automatically charge the selected payment method on your autopay day.
                          </p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="autopayDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Autopay day</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={String(field.value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => (
                            <SelectItem key={day} value={String(day)}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Autopay runs at 7am local time on the selected day.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="couponCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coupon code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter coupon"
                          value={field.value}
                          onChange={(event) => field.onChange(event.target.value)}
                        />
                      </FormControl>
                      <FormDescription>
                        Coupons are validated with Stripe or internal eligibility rules.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {selectedPlan ? (
                <div className="rounded-lg border bg-muted/40 p-4">
                  <div className="flex items-center gap-2">
                    <Info className="size-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">{selectedPlan.name} includes:</p>
                  </div>
                  <ul className="mt-2 grid gap-1 text-sm text-muted-foreground md:grid-cols-2">
                    {selectedPlan.perks.map((perk) => (
                      <li key={perk} className="flex items-center gap-2">
                        <span className="inline-block size-1.5 rounded-full bg-primary" aria-hidden />
                        {perk}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  {statusMessage ? statusMessage : "Preferences are saved automatically when a coupon is applied."}
                </div>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Checking coupon..." : "Save & validate"}
                </Button>
              </div>
            </form>
          </Form>

          {couponResult ? (
            <div
              className={cn(
                "mt-6 rounded-lg border p-4",
                couponResult.valid ? "border-emerald-400 bg-emerald-50/80" : "border-destructive/60 bg-destructive/10"
              )}
            >
              <p className="text-sm font-medium">
                {couponResult.valid
                  ? `${couponResult.couponName ?? couponResult.code} applied`
                  : couponResult.message || "Coupon could not be applied"}
              </p>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <p>
                  Source: <span className="font-medium text-foreground">{couponResult.source}</span>
                </p>
                {couponResult.discount ? (
                  <p>
                    Discount: {couponResult.discount.type === "percent"
                      ? `${couponResult.discount.percentOff}% ${couponResult.discount.duration}`
                      : `${formatCurrency(couponResult.discount.amountOff, couponResult.discount.currency)} ${couponResult.discount.duration}`}
                  </p>
                ) : null}
                {couponResult.trialExtensionDays ? (
                  <p>Extends trial by {couponResult.trialExtensionDays} days.</p>
                ) : null}
                {couponResult.expiresAt ? (
                  <p>Expires {format(new Date(couponResult.expiresAt), "MMM d, yyyy")}</p>
                ) : null}
                {couponResult.restrictions?.length ? (
                  <ul className="list-disc space-y-1 pl-4">
                    {couponResult.restrictions.map((restriction) => (
                      <li key={restriction}>{restriction}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <TrialStatusCard trialStatus={trialStatus} />
        <RecentCouponsCard coupons={overview.recentCoupons} />
      </div>
    </div>
  )
}

type TrialStatusCardProps = {
  trialStatus: ReturnType<typeof evaluateTrialStatus>
}

function TrialStatusCard({ trialStatus }: TrialStatusCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Free trial status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {trialStatus.status === "converted" ? (
          <>
            <p className="font-medium text-foreground">Trial converted</p>
            <p className="text-muted-foreground">
              Subscription activated on {format(new Date(trialStatus.convertedAt), "MMM d, yyyy")}.
            </p>
          </>
        ) : trialStatus.status === "cancelled" ? (
          <>
            <p className="font-medium text-foreground">Trial cancelled</p>
            <p className="text-muted-foreground">
              Access ended on {format(new Date(trialStatus.cancelledAt), "MMM d, yyyy")}. Contact support to restart.
            </p>
          </>
        ) : trialStatus.status === "active" ? (
          <>
            <p className="font-medium text-foreground">Trial active</p>
            <p className="text-muted-foreground">
              {trialStatus.daysRemaining} day{trialStatus.daysRemaining === 1 ? "" : "s"} remaining.
              Scheduled to convert on {format(new Date(trialStatus.endsAt), "MMM d, yyyy")}.
            </p>
          </>
        ) : trialStatus.status === "grace_period" ? (
          <>
            <p className="font-medium text-foreground">Trial grace period</p>
            <p className="text-muted-foreground">
              Renew or update payment method before {format(new Date(trialStatus.graceEndsAt), "MMM d, yyyy")} to stay active.
            </p>
          </>
        ) : (
          <>
            <p className="font-medium text-foreground">Trial expired</p>
            <p className="text-muted-foreground">
              Trial ended on {format(new Date(trialStatus.endedAt), "MMM d, yyyy")}. Apply an eligible coupon to re-activate.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

type RecentCouponsCardProps = {
  coupons: BillingOverview["recentCoupons"]
}

function RecentCouponsCard({ coupons }: RecentCouponsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recently shared coupons</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        {coupons.map((coupon) => (
          <div key={coupon.code} className="rounded-lg border bg-background p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">{coupon.code}</span>
              <Badge variant="outline">Suggested</Badge>
            </div>
            <p className="mt-1 text-sm">{coupon.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

