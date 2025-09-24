import type { Metadata } from "next"

import {
  getWebhookReplayAuditLog,
  listWebhookDeliveries,
} from "@/lib/data/webhook-deliveries"

import { DeliveriesTable } from "./components/deliveries-table"
import { ReplayAuditLog } from "./components/replay-audit-log"

export const metadata: Metadata = {
  title: "Webhook deliveries",
}

export default async function WebhookDeliveriesPage() {
  const [deliveries, auditLog] = await Promise.all([
    listWebhookDeliveries(),
    getWebhookReplayAuditLog(),
  ])

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Webhook deliveries
        </h1>
        <p className="text-sm text-muted-foreground">
          Review webhook attempts, inspect payloads, and queue manual replays
          when downstream systems need a nudge.
        </p>
      </header>

      <DeliveriesTable deliveries={deliveries} />

      <ReplayAuditLog entries={auditLog} />
    </div>
  )
}
