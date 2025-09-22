import { notFound } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { canManageReceipt } from "@/lib/authorization/receipts"
import type { Tables } from "@/lib/supabase"
import { getPaymentById } from "@/queries/payments"
import { createClient } from "@/utils/supabase/server"

import { ReceiptUploader } from "./receipt-uploader"

type PaymentPageProps = {
  params: { id: string }
}

function formatCurrency(amountCents: number, currency: string) {
  const normalizedCurrency = currency?.toUpperCase() || "USD"

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: normalizedCurrency,
    currencyDisplay: "symbol",
  }).format(amountCents / 100)
}

function formatDate(value: string | null) {
  if (!value) return "Not specified"

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed)
}

export default async function PaymentReceiptPage({ params }: PaymentPageProps) {
  const supabase = createClient()
  const { data: payment, error } = await getPaymentById(supabase, params.id)

  if (error || !payment) {
    notFound()
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let viewerProfile: Pick<Tables<"profiles">, "id" | "role" | "full_name"> | null = null

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", user.id)
      .maybeSingle()

    viewerProfile = profile ?? null
  }

  const allowedToManageReceipt = canManageReceipt(payment.payer_id, viewerProfile)
  const amountLabel = formatCurrency(payment.amount_cents, payment.currency)
  const dueDateLabel = formatDate(payment.due_date)
  const createdAtLabel = formatDate(payment.created_at)

  const statusVariant = payment.status === "paid" ? "secondary" : "outline"

  return (
    <div className="container max-w-3xl space-y-8 py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Payment receipt</h1>
        <p className="text-base text-muted-foreground">
          Upload bank transfer confirmations or cash payment receipts to reconcile balances quickly.
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>{amountLabel}</CardTitle>
            <CardDescription>
              {payment.description ?? "Rent or shared expense payment"}
            </CardDescription>
          </div>
          <Badge variant={statusVariant} className="uppercase">
            {payment.status}
          </Badge>
        </CardHeader>
        <Separator />
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Due date</p>
            <p className="text-base font-semibold">{dueDateLabel}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Recorded</p>
            <p className="text-base font-semibold">{createdAtLabel}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Payer</p>
            <p className="text-base font-semibold">
              {payment.payer?.full_name ?? "Resident"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Receipt</p>
            <p className="text-base font-semibold">
              {payment.receipt_path ? "On file" : "Not uploaded"}
            </p>
          </div>
        </CardContent>
      </Card>
      <ReceiptUploader
        paymentId={payment.id}
        initialReceiptPath={payment.receipt_path}
        canManageReceipt={allowedToManageReceipt}
      />
    </div>
  )
}
