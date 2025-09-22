import { createHash } from "crypto"

export type Invoice = {
  id: string
  tenantId: string
  tenantName: string
  unitLabel: string
  leaseId: string
  periodLabel: string
  dueDate: string
  issuedAt: string
  amountDue: number
  currency: string
  status: "open" | "processing" | "paid"
}

const demoInvoice: Invoice = {
  id: "INV-2024-0007",
  tenantId: "tenant-3a",
  tenantName: "Casey Morgan",
  unitLabel: "Unit 3A",
  leaseId: "LEASE-8842",
  periodLabel: "July 2024 Rent",
  dueDate: new Date("2024-07-01T00:00:00Z").toISOString(),
  issuedAt: new Date("2024-06-15T10:00:00Z").toISOString(),
  amountDue: 1825,
  currency: "CAD",
  status: "open",
}

export function generateETransferReference(invoice: Pick<Invoice, "id" | "tenantId" | "leaseId">) {
  const invoiceFragment = invoice.id.replace(/[^A-Za-z0-9]/g, "").slice(-6).toUpperCase()
  const digestSource = `${invoice.id}:${invoice.tenantId}:${invoice.leaseId}`
  const digest = createHash("sha256").update(digestSource).digest("hex").slice(0, 6).toUpperCase()
  return `${invoiceFragment}-${digest}`
}

export async function fetchActiveInvoiceForTenant(): Promise<Invoice> {
  // In production this would query Supabase for the tenant's open invoice. For now we
  // return a representative invoice so the UI can render deterministic reference data.
  return demoInvoice
}
