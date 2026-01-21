import { renderEmailTemplate } from "@/emails/template-engine"
import { z } from "zod"

const DEFAULT_BUSINESS_NAME = "Roomsily"
const DEFAULT_TEMPLATE_VERSION = "v1" as const

export const paymentReceiptLineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive().optional(),
  unitAmount: z.number().nonnegative().optional(),
  totalAmount: z.number().nonnegative().optional(),
})

export const paymentReceiptEmailDataSchema = z.object({
  customerName: z.string().min(1),
  paymentId: z.string().min(1),
  amountPaid: z.number().positive(),
  currency: z.string().min(3).max(10),
  paymentDate: z.coerce.date(),
  items: z.array(paymentReceiptLineItemSchema).optional(),
  businessName: z.string().optional(),
  supportEmail: z.string().email().optional(),
  billingAddress: z.string().optional(),
  notes: z.string().optional(),
  subtotalAmount: z.number().nonnegative().optional(),
  taxAmount: z.number().nonnegative().optional(),
  discountAmount: z.number().nonnegative().optional(),
})

export type PaymentReceiptEmailData = z.infer<typeof paymentReceiptEmailDataSchema>
export type PaymentReceiptLineItem = z.infer<typeof paymentReceiptLineItemSchema>

interface PaymentReceiptEmailViewModel {
  businessName: string
  customerName: string
  paymentId: string
  paymentDate: string
  amountPaid: string
  showLineItems: boolean
  lineItems: Array<{
    description: string
    quantity: string
    unitAmount: string
    totalAmount: string
  }>
  showAdjustments: boolean
  totals: Array<{
    label: string
    value: string
    emphasis?: boolean
  }>
  showBillingAddress: boolean
  billingAddress?: string
  showNotes: boolean
  notes?: string
  supportEmail?: string
}

const formatCurrency = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount)
  } catch (error) {
    return `${amount.toFixed(2)} ${currency}`
  }
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

const buildLineItems = (
  items: PaymentReceiptLineItem[] | undefined,
  currency: string
): PaymentReceiptEmailViewModel["lineItems"] => {
  if (!items) {
    return []
  }

  return items.map((item) => {
    const quantity = item.quantity != null ? String(item.quantity) : "—"
    const unitAmount =
      item.unitAmount != null
        ? formatCurrency(item.unitAmount, currency)
        : "—"

    let totalAmount: string
    if (item.totalAmount != null) {
      totalAmount = formatCurrency(item.totalAmount, currency)
    } else if (item.unitAmount != null && item.quantity != null) {
      totalAmount = formatCurrency(item.unitAmount * item.quantity, currency)
    } else {
      totalAmount = "—"
    }

    return {
      description: item.description,
      quantity,
      unitAmount,
      totalAmount,
    }
  })
}

const buildTotals = (
  data: PaymentReceiptEmailData,
  currency: string
): Pick<
  PaymentReceiptEmailViewModel,
  "showAdjustments" | "totals"
> => {
  const totals: PaymentReceiptEmailViewModel["totals"] = []

  if (data.subtotalAmount != null) {
    totals.push({
      label: "Subtotal",
      value: formatCurrency(data.subtotalAmount, currency),
    })
  }

  if (data.taxAmount != null) {
    totals.push({
      label: "Tax",
      value: formatCurrency(data.taxAmount, currency),
    })
  }

  if (data.discountAmount != null) {
    totals.push({
      label: "Discount",
      value: `-${formatCurrency(data.discountAmount, currency)}`,
    })
  }

  totals.push({
    label: "Total Paid",
    value: formatCurrency(data.amountPaid, currency),
    emphasis: true,
  })

  const hasAdjustments =
    data.subtotalAmount != null ||
    data.taxAmount != null ||
    data.discountAmount != null

  return {
    showAdjustments: hasAdjustments,
    totals,
  }
}

export interface RenderPaymentReceiptOptions {
  version?: string
}

export async function renderPaymentReceiptEmail(
  data: PaymentReceiptEmailData,
  options: RenderPaymentReceiptOptions = {}
) {
  const parsed = paymentReceiptEmailDataSchema.parse(data)

  const businessName = parsed.businessName ?? DEFAULT_BUSINESS_NAME
  const lineItems = buildLineItems(parsed.items, parsed.currency)
  const totals = buildTotals(parsed, parsed.currency)
  const billingAddress = parsed.billingAddress?.trim()
  const notes = parsed.notes?.trim()

  const viewModel: PaymentReceiptEmailViewModel = {
    businessName,
    customerName: parsed.customerName,
    paymentId: parsed.paymentId,
    paymentDate: formatDate(parsed.paymentDate),
    amountPaid: formatCurrency(parsed.amountPaid, parsed.currency),
    showLineItems: lineItems.length > 0,
    lineItems,
    ...totals,
    showBillingAddress: Boolean(billingAddress?.length),
    billingAddress,
    showNotes: Boolean(notes?.length),
    notes,
    supportEmail: parsed.supportEmail,
  }

  return renderEmailTemplate(
    {
      name: "payment-receipt",
      version: options.version ?? DEFAULT_TEMPLATE_VERSION,
    },
    viewModel
  )
}
