import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import PaymentForm from "./payment-form"
import { createClient } from "@/utils/supa-server-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export type InvoiceSummary = {
  id: string
  amountDue: number
  currency: string
  description: string | null
  dueDate: string | null
  status: string
}

export default async function TenantPaymentPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("id, amount_due, currency, description, due_date, status")
    .eq("tenant_id", user.id)
    .order("due_date", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const invoiceSummaries: InvoiceSummary[] = (invoices ?? []).map((invoice) => ({
    id: invoice.id,
    amountDue: invoice.amount_due,
    currency: invoice.currency,
    description: invoice.description,
    dueDate: invoice.due_date,
    status: invoice.status,
  }))

  return (
    <div className="container max-w-4xl space-y-10 py-10">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-3xl font-semibold">Pay an invoice</CardTitle>
          <CardDescription>
            Kick off a secure Stripe checkout without leaving the portal. Choose how much to pay and whether you
            prefer cards or pre-authorized debit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Separator className="my-6" />
          <PaymentForm invoices={invoiceSummaries} tenantEmail={user.email ?? ""} />
        </CardContent>
      </Card>
    </div>
  )
}
