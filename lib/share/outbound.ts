import { format } from "date-fns"

import { formatCurrency } from "@/lib/payments/currency"
import type { DocumentWithLease } from "@/types/documents"
import type { PaymentReceiptHistoryEntry } from "@/types/payments"

export interface ShareContentPayload {
  title?: string
  text?: string
  url?: string
}

export type ShareStatus = "shared" | "copied" | "aborted" | "unsupported"

export interface ShareDocumentOptions {
  baseUrl?: string
}

export interface SharePaymentOptions {
  baseUrl?: string
  shareUrl?: string
}

export interface ShareThreadDetails {
  id: string
  title: string
  summary: string
  category?: string
  participants?: number
  lastMessageAt?: string
  href?: string
  url?: string
}

export interface ShareThreadOptions {
  baseUrl?: string
}

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

export function resolveShareUrl(url: string | undefined, baseUrl?: string): string | undefined {
  if (!url) return undefined
  if (isAbsoluteUrl(url)) {
    return url
  }

  if (!baseUrl) {
    return url
  }

  try {
    return new URL(url, baseUrl).toString()
  } catch (error) {
    return url
  }
}

export async function shareContent(
  payload: ShareContentPayload,
  options: { fallbackText?: string } = {},
): Promise<ShareStatus> {
  if (typeof navigator === "undefined") {
    return "unsupported"
  }

  if (navigator.share) {
    try {
      await navigator.share(payload)
      return "shared"
    } catch (error) {
      if (typeof DOMException !== "undefined" && error instanceof DOMException) {
        if (error.name === "AbortError") {
          return "aborted"
        }
      }
      // If the share failed for another reason, fall through to clipboard fallback
    }
  }

  const fallbackText = options.fallbackText ?? payload.url ?? payload.text
  if (fallbackText && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(fallbackText)
      return "copied"
    } catch (error) {
      return "unsupported"
    }
  }

  return "unsupported"
}

export function buildDocumentSharePayload(
  document: DocumentWithLease,
  options: ShareDocumentOptions = {},
): ShareContentPayload {
  const shareUrl = resolveShareUrl(document.file_url ?? undefined, options.baseUrl)
  const context: string[] = []

  if (document.description) {
    context.push(document.description)
  }

  const lease = document.lease
  const leaseDetails: string[] = []
  if (lease?.unit_number) {
    leaseDetails.push(`Unit ${lease.unit_number}`)
  }
  if (lease?.property_address) {
    leaseDetails.push(lease.property_address)
  }
  if (leaseDetails.length) {
    context.push(leaseDetails.join(" • "))
  }

  if (document.requires_signature) {
    context.push("Signature required")
  }

  const text = context.join("\n")

  return {
    title: `${document.title} – Roomsily`,
    text: text || undefined,
    url: shareUrl,
  }
}

export async function shareDocument(
  document: DocumentWithLease,
  options: ShareDocumentOptions = {},
): Promise<ShareStatus> {
  const payload = buildDocumentSharePayload(document, options)
  return shareContent(payload, { fallbackText: payload.url })
}

export function buildPaymentReceiptSharePayload(
  receipt: PaymentReceiptHistoryEntry,
  options: SharePaymentOptions = {},
): ShareContentPayload {
  const amount = formatCurrency(receipt.amount, receipt.currency)
  let issuedOn = ""
  try {
    issuedOn = format(new Date(receipt.paymentDate), "MMM d, yyyy")
  } catch (error) {
    issuedOn = receipt.paymentDate
  }

  const shareUrl = resolveShareUrl(options.shareUrl ?? receipt.receiptUrl ?? receipt.invoiceUrl, options.baseUrl)

  const summaryLines: string[] = []
  summaryLines.push(`${amount} on ${issuedOn} • ${receipt.paymentMethod}`)
  summaryLines.push(`Status: ${receipt.status}`)

  const primaryLineItem = receipt.lineItems[0]?.description
  if (primaryLineItem) {
    summaryLines.push(`Key line item: ${primaryLineItem}`)
  }

  if (receipt.memo) {
    summaryLines.push(`Memo: ${receipt.memo}`)
  }

  return {
    title: `Receipt • ${receipt.issuedTo}`,
    text: summaryLines.join("\n"),
    url: shareUrl,
  }
}

export async function sharePaymentReceipt(
  receipt: PaymentReceiptHistoryEntry,
  options: SharePaymentOptions = {},
): Promise<ShareStatus> {
  const payload = buildPaymentReceiptSharePayload(receipt, options)
  return shareContent(payload, { fallbackText: payload.url })
}

export function buildThreadSharePayload(
  thread: ShareThreadDetails,
  options: ShareThreadOptions = {},
): ShareContentPayload {
  const shareUrl = resolveShareUrl(thread.url ?? thread.href, options.baseUrl)
  const summaryLines: string[] = [thread.summary]

  const meta: string[] = []
  if (thread.category) {
    meta.push(thread.category)
  }
  if (typeof thread.participants === "number" && thread.participants > 0) {
    meta.push(`${thread.participants} roommates involved`)
  }
  if (meta.length) {
    summaryLines.push(meta.join(" • "))
  }
  if (thread.lastMessageAt) {
    summaryLines.push(`Last activity: ${thread.lastMessageAt}`)
  }

  return {
    title: `${thread.title} – Roomsily thread`,
    text: summaryLines.join("\n"),
    url: shareUrl,
  }
}

export async function shareThread(
  thread: ShareThreadDetails,
  options: ShareThreadOptions = {},
): Promise<ShareStatus> {
  const payload = buildThreadSharePayload(thread, options)
  return shareContent(payload, { fallbackText: payload.url })
}
