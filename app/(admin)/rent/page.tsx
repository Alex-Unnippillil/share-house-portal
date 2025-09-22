import { createClient } from "@/utils/supabase/server"

import {
  type InvoiceMemberOption,
  type RecentInvoiceSummary,
  type SupplyShareOption,
  InvoiceBuilder,
} from "./_components/invoice-form"

async function loadMembers(client: ReturnType<typeof createClient>) {
  const { data, error } = await client
    .from("profiles")
    .select("id, full_name, email")
    .order("full_name", { ascending: true })

  if (error) {
    console.error("Failed to load profiles", error)
    return [] as InvoiceMemberOption[]
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.full_name ?? row.email ?? "Unnamed roommate",
    email: row.email,
    defaultRent: null,
  })) satisfies InvoiceMemberOption[]
}

async function loadSupplyShares(client: ReturnType<typeof createClient>) {
  const { data, error } = await client
    .from("supply_shares")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("Failed to load supply shares", error)
    return [] as SupplyShareOption[]
  }

  return (data ?? [])
    .filter((row) => {
      if (!row.member_id) return false
      const status = typeof row.status === "string" ? row.status.toLowerCase() : ""
      return ["", "open", "pending", "unbilled", "draft"].includes(status)
    })
    .map((row) => {
      const amountCandidate =
        typeof row.share_amount === "number"
          ? row.share_amount
          : typeof row.amount === "number"
            ? row.amount
            : 0

      return {
        id: row.id as string,
        memberId: row.member_id as string,
        amount: amountCandidate ?? 0,
        label:
          (row.label as string | null) ??
          (row.description as string | null) ??
          (row.name as string | null) ??
          "Shared supply",
        billingMonth:
          (row.billing_month as string | null) ??
          (row.month as string | null) ??
          (row.period as string | null) ??
          null,
        createdAt: (row.created_at as string | null) ?? null,
      }
    }) satisfies SupplyShareOption[]
}

async function loadRecentInvoices(
  client: ReturnType<typeof createClient>,
  members: InvoiceMemberOption[],
) {
  const { data, error } = await client
    .from("rent_invoices")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(15)

  if (error) {
    console.error("Failed to load invoices", error)
    return [] as RecentInvoiceSummary[]
  }

  const memberMap = new Map(members.map((member) => [member.id, member]))

  return (data ?? [])
    .filter((row) => {
      const status = typeof row.status === "string" ? row.status.toLowerCase() : ""
      return ["draft", "open", "pending"].includes(status)
    })
    .map((row) => {
      const rentAmount = typeof row.rent_amount === "number" ? row.rent_amount : null
      const supplyTotal = typeof row.supply_total === "number" ? row.supply_total : null
      const totalAmountCandidate =
        typeof row.total_amount === "number"
          ? row.total_amount
          : rentAmount && supplyTotal
            ? rentAmount + supplyTotal
            : typeof row.amount === "number"
              ? row.amount
              : 0

      const member = memberMap.get(row.member_id as string)

      return {
        id: row.id as string,
        memberId: (row.member_id as string) ?? "",
        memberName: member?.name ?? "Unassigned roommate",
        status: (row.status as string | null) ?? "draft",
        billingMonth:
          (row.billing_month as string | null) ??
          (row.month as string | null) ??
          "",
        dueDate: (row.due_date as string | null) ?? "",
        totalAmount: Number(totalAmountCandidate ?? 0),
        rentAmount,
        supplyTotal,
        createdAt: (row.created_at as string | null) ?? null,
        memo: (row.memo as string | null) ?? (row.notes as string | null) ?? null,
      }
    }) satisfies RecentInvoiceSummary[]
}

export default async function RentAdminPage() {
  const supabase = createClient()
  const members = await loadMembers(supabase)

  const [supplyShares, recentInvoices] = await Promise.all([
    loadSupplyShares(supabase),
    loadRecentInvoices(supabase, members),
  ])

  return (
    <div className="container max-w-6xl space-y-10 py-10">
      <header className="space-y-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Rent & invoices</h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Draft monthly charges for each roommate, fold in outstanding supply splits, and keep tabs on open invoices.
          </p>
        </div>
      </header>
      <InvoiceBuilder
        members={members}
        supplyShares={supplyShares}
        recentInvoices={recentInvoices}
      />
    </div>
  )
}
