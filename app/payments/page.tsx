import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { type CookieOptions, createServerClient } from "@supabase/ssr"

import { AutoPaySettingsForm } from "@/components/payments/autopay-settings-form"
import { AutoPaySummaryCard } from "@/components/payments/autopay-summary-card"
import { PaymentScheduleTable } from "@/components/payments/payment-schedule-table"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type {
  RentPaymentOccurrenceRow,
  RentPaymentScheduleRow,
} from "@/lib/payments/autopay-scheduler"
import { ensureScheduleTimeline } from "@/lib/payments/autopay-service"

const paymentHighlights = [
  {
    title: "AutoPay scheduling",
    description:
      "Enable recurring rent collection with configurable due dates, grace periods, and automatic late fee handling.",
  },
  {
    title: "One-time catch up",
    description:
      "Support partial or one-off payments so roommates can settle balances without waiting for the next billing cycle.",
  },
  {
    title: "Receipt history",
    description:
      "Download itemized receipts and export payment history for reimbursement, tax, or dispute resolution needs.",
  },
  {
    title: "Shared ledger",
    description:
      "Track individual roommate contributions alongside property manager adjustments to maintain full transparency.",
  },
]

async function getSupabaseForServer() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options })
        },
      },
    }
  )
}

async function loadScheduleWithOccurrences(client: Awaited<ReturnType<typeof getSupabaseForServer>>, tenantId: string) {
  const { data: scheduleRow, error: scheduleError } = await client
    .from("rent_payment_schedules")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle<RentPaymentScheduleRow>()

  if (scheduleError) {
    console.error("Failed to load AutoPay schedule", scheduleError)
  }

  if (!scheduleRow || scheduleError) {
    return { schedule: null, occurrences: [] as RentPaymentOccurrenceRow[] }
  }

  await ensureScheduleTimeline(client, scheduleRow)

  const { data: scheduleWithOccurrences, error } = await client
    .from("rent_payment_schedules")
    .select("*, occurrences:rent_payment_occurrences(*)")
    .eq("id", scheduleRow.id)
    .maybeSingle<
      RentPaymentScheduleRow & { occurrences: RentPaymentOccurrenceRow[] }
    >()

  if (error || !scheduleWithOccurrences) {
    if (error) {
      console.error("Failed to fetch payment occurrences", error)
    }
    return { schedule: scheduleRow, occurrences: [] as RentPaymentOccurrenceRow[] }
  }

  return {
    schedule: scheduleWithOccurrences,
    occurrences: scheduleWithOccurrences.occurrences ?? [],
  }
}

export default async function PaymentsPage() {
  const supabase = await getSupabaseForServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  const { schedule, occurrences } = await loadScheduleWithOccurrences(supabase, user.id)

  return (
    <div className="container max-w-5xl space-y-10 py-12">
      <header className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Payments</h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Manage rent, deposits, and roommate contributions with Stripe-powered autopay and real-time status updates.
          </p>
        </div>
        <Separator />
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <AutoPaySummaryCard schedule={schedule} />
        <div className="rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold">AutoPay settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure recurring rent collection, grace periods, and late fee policies for this unit.
          </p>
          <div className="mt-6">
            <AutoPaySettingsForm schedule={schedule} />
          </div>
        </div>
      </div>

      <PaymentScheduleTable schedule={schedule} occurrences={occurrences} />

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Billing capabilities</h2>
          <p className="text-sm text-muted-foreground">
            Tools that help property managers and roommates stay aligned on payments.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {paymentHighlights.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
