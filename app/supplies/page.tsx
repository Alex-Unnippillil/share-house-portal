import { cookies } from "next/headers"

import { formatCurrency } from "@/lib/payments/currency"
import createSupabaseServer from "@/utils/supabase-server"
import type { SupplyShareLedgerEntry } from "@/types/supplies"

import { SupplyLedger } from "./_components/supply-ledger"

function getProfileLabel(
  id: string | null | undefined,
  profiles: Map<string, { full_name: string | null; email: string | null }>,
  fallbackLabel = "Unknown roommate",
) {
  if (!id) {
    return fallbackLabel
  }

  const profile = profiles.get(id)
  if (!profile) {
    return fallbackLabel
  }

  return profile.full_name ?? profile.email ?? fallbackLabel
}

export default async function SuppliesPage() {
  const cookieStore = cookies()
  const supabase = createSupabaseServer(cookieStore)

  const { data: shareRows, error: shareError } = await supabase
    .from("supply_shares")
    .select(
      "id, description, amount, currency, roommate_id, status, created_at, updated_at, created_by, settled_at, settled_by, settlement_method, settlement_invoice_id, settlement_note",
    )
    .order("created_at", { ascending: false })

  if (shareError) {
    console.error("supplies ledger fetch error", shareError)
  }

  const sharesData = shareRows ?? []
  const shareIds = sharesData.map((share) => share.id)

  const { data: auditRows, error: auditError } =
    shareIds.length > 0
      ? await supabase
          .from("supply_share_audit_events")
          .select(
            "id, share_id, event_type, previous_status, new_status, settlement_method, settlement_invoice_id, note, context, created_at, created_by",
          )
          .in("share_id", shareIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null }

  if (auditError) {
    console.error("supplies ledger audit fetch error", auditError)
  }

  const auditData = auditRows ?? []
  const participantIds = new Set<string>()

  for (const share of sharesData) {
    if (share.roommate_id) {
      participantIds.add(share.roommate_id)
    }
    if (share.created_by) {
      participantIds.add(share.created_by)
    }
    if (share.settled_by) {
      participantIds.add(share.settled_by)
    }
  }

  for (const event of auditData) {
    if (event.created_by) {
      participantIds.add(event.created_by)
    }
  }

  const profileLookup: Map<string, { full_name: string | null; email: string | null }> = new Map()

  if (participantIds.size > 0) {
    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", Array.from(participantIds))

    if (profileError) {
      console.error("supplies ledger profile fetch error", profileError)
    }

    for (const profile of profileRows ?? []) {
      profileLookup.set(profile.id, {
        full_name: profile.full_name,
        email: profile.email,
      })
    }
  }

  const shares: SupplyShareLedgerEntry[] = sharesData.map((share) => {
    const relatedEvents = auditData
      .filter((event) => event.share_id === share.id)
      .map((event) => ({
        id: event.id,
        shareId: event.share_id,
        eventType: event.event_type,
        createdAt: event.created_at,
        createdBy: event.created_by,
        createdByName: getProfileLabel(event.created_by, profileLookup, "System"),
        previousStatus: event.previous_status ?? undefined,
        newStatus: event.new_status ?? undefined,
        settlementMethod: event.settlement_method ?? undefined,
        settlementInvoiceId: event.settlement_invoice_id ?? undefined,
        note: event.note ?? undefined,
        context: (event.context as Record<string, unknown>) ?? undefined,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return {
      id: share.id,
      description: share.description,
      amount: typeof share.amount === "number" ? share.amount : Number(share.amount),
      currency: share.currency,
      roommateId: share.roommate_id,
      roommateName: getProfileLabel(share.roommate_id, profileLookup),
      status: share.status,
      createdAt: share.created_at,
      updatedAt: share.updated_at,
      createdBy: share.created_by ?? undefined,
      createdByName: getProfileLabel(share.created_by, profileLookup, "Unknown"),
      settledAt: share.settled_at ?? undefined,
      settledBy: share.settled_by ?? undefined,
      settledByName: getProfileLabel(share.settled_by, profileLookup, "Unknown"),
      settlementMethod: share.settlement_method ?? undefined,
      settlementInvoiceId: share.settlement_invoice_id ?? undefined,
      settlementNote: share.settlement_note ?? undefined,
      auditTrail: relatedEvents,
    }
  })

  const totalOpen = shares.filter((share) => share.status === "open").reduce((sum, share) => sum + share.amount, 0)
  const totalSettled = shares
    .filter((share) => share.status === "settled")
    .reduce((sum, share) => sum + share.amount, 0)

  return (
    <div className="container max-w-5xl space-y-8 py-10">
      <header className="space-y-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Shared supplies ledger</h1>
          <p className="text-muted-foreground">
            Track household supply reimbursements, mark shares as settled, and keep an audit trail of adjustments.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span>
            Open balance: <span className="font-semibold text-foreground">{formatCurrency(totalOpen, shares[0]?.currency ?? "USD")}</span>
          </span>
          <span aria-hidden="true">•</span>
          <span>
            Settled this cycle: <span className="font-semibold text-foreground">{formatCurrency(totalSettled, shares[0]?.currency ?? "USD")}</span>
          </span>
          <span aria-hidden="true">•</span>
          <span>{shares.length} share{shares.length === 1 ? "" : "s"} tracked</span>
        </div>
      </header>
      <SupplyLedger shares={shares} />
    </div>
  )
}
