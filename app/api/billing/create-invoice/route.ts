import createSupabaseServerClient from '@/lib/supabaseServer'
import { z } from 'zod'

type HouseholdMemberRecord = {
  profile_id: string
  rent_share: number | null
}

type PerMemberLineItem = {
  description: string
  amount: number
  quantity: number
}

const lineItemSchema = z.object({
  description: z.string().min(1, 'Line item description is required.'),
  amount: z.number().nonnegative(),
  quantity: z.number().int().positive().optional(),
})

const lateFeeSchema = z
  .object({
    flatAmount: z.number().nonnegative().optional(),
    percentage: z.number().nonnegative().max(100).optional(),
    gracePeriodDays: z.number().int().nonnegative().optional(),
    maximumAmount: z.number().nonnegative().optional(),
    dailyRate: z.number().nonnegative().optional(),
  })
  .refine(
    (value) => value.flatAmount !== undefined || value.percentage !== undefined,
    {
      message: 'Provide either a flatAmount or percentage for late fees.',
      path: ['flatAmount'],
    },
  )

const createInvoiceSchema = z.object({
  householdId: z.string().min(1, 'householdId is required.'),
  billingPeriod: z
    .object({
      start: z.coerce.date(),
      end: z.coerce.date(),
    })
    .refine((period) => period.end >= period.start, {
      message: 'Billing period end must be after the start date.',
      path: ['end'],
    }),
  dueDate: z.coerce.date(),
  totalAmount: z.number().positive(),
  memo: z.string().max(2000).optional(),
  lineItems: z.array(lineItemSchema).optional(),
  lateFee: lateFeeSchema.optional(),
})

type CreateInvoicePayload = z.infer<typeof createInvoiceSchema>
type LateFeeConfig = NonNullable<CreateInvoicePayload['lateFee']>

type InvoiceInsertPayload = {
  household_id: string
  resident_id: string
  amount_due: number
  due_date: string
  billing_period_start: string
  billing_period_end: string
  status: string
  memo: string | null
  metadata: Record<string, unknown>
}

type InvoiceLineItemInsertPayload = {
  invoice_id: string | number
  description: string
  amount: number
  quantity: number
}

export async function POST(request: Request) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON payload.'
    return Response.json({ error: message }, { status: 400 })
  }

  const parsed = createInvoiceSchema.safeParse(payload)

  if (!parsed.success) {
    return Response.json(
      {
        error: 'Invalid invoice payload.',
        details: parsed.error.flatten(),
      },
      { status: 400 },
    )
  }

  const supabase = createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const invoiceInput = parsed.data

  const { data: membershipData, error: membershipError } = await supabase
    .from('household_members' as any)
    .select('profile_id, rent_share')
    .eq('household_id', invoiceInput.householdId)

  if (membershipError) {
    return Response.json(
      { error: 'Unable to verify household membership.' },
      { status: 500 },
    )
  }

  const members = (membershipData ?? []) as HouseholdMemberRecord[]

  if (!members.length) {
    return Response.json(
      { error: 'Household must have at least one member to create invoices.' },
      { status: 422 },
    )
  }

  const callerIsMember = members.some((member) => member.profile_id === user.id)

  if (!callerIsMember) {
    return Response.json(
      { error: 'You do not have permission to create invoices for this household.' },
      { status: 403 },
    )
  }

  const shareWeights = members.map((member) => Math.max(member.rent_share ?? 0, 0))
  const totalShare = shareWeights.reduce((sum, share) => sum + share, 0)

  if (totalShare <= 0) {
    return Response.json(
      { error: 'Unable to calculate rent splits because no member has a rent share.' },
      { status: 422 },
    )
  }

  const lineItems = invoiceInput.lineItems ?? []
  const billingPeriodStartIso = invoiceInput.billingPeriod.start.toISOString()
  const billingPeriodEndIso = invoiceInput.billingPeriod.end.toISOString()
  const dueDateIso = invoiceInput.dueDate.toISOString()
  const invoiceAmounts = allocateByShares(invoiceInput.totalAmount, shareWeights)
  const lineItemAllocations = lineItems.map((item) =>
    allocateByShares(item.amount, shareWeights),
  )

  let lateFeeAllocations: number[] = []
  let lateFeeScheduleIso: string | null = null

  if (invoiceInput.lateFee) {
    const lateFeeTotal = computeLateFeeTotal(invoiceInput.lateFee, invoiceInput.totalAmount)
    lateFeeAllocations = allocateByShares(lateFeeTotal, shareWeights)
    lateFeeScheduleIso = addDays(
      invoiceInput.dueDate,
      invoiceInput.lateFee.gracePeriodDays ?? 0,
    ).toISOString()
  }

  const invoiceLineItemsByMember: PerMemberLineItem[][] = []

  const invoicesPayload: InvoiceInsertPayload[] = members.map((member, index) => {
    const perMemberLineItems = lineItems.map((item, itemIndex) => ({
      description: item.description,
      quantity: item.quantity ?? 1,
      amount: lineItemAllocations[itemIndex]?.[index] ?? 0,
    }))

    invoiceLineItemsByMember.push(perMemberLineItems)

    const metadata: Record<string, unknown> = {
      rentShare: shareWeights[index] / totalShare,
      billingPeriod: {
        start: billingPeriodStartIso,
        end: billingPeriodEndIso,
      },
      totalHouseholdAmount: invoiceInput.totalAmount,
    }

    if (perMemberLineItems.length) {
      metadata.lineItems = perMemberLineItems
    }

    if (invoiceInput.lateFee) {
      metadata.lateFee = {
        ...invoiceInput.lateFee,
        amount: lateFeeAllocations[index] ?? 0,
        scheduleDate: lateFeeScheduleIso,
        basis: invoiceInput.lateFee.flatAmount !== undefined ? 'flat' : 'percentage',
      }
    }

    return {
      household_id: invoiceInput.householdId,
      resident_id: member.profile_id,
      amount_due: invoiceAmounts[index] ?? 0,
      due_date: dueDateIso,
      billing_period_start: billingPeriodStartIso,
      billing_period_end: billingPeriodEndIso,
      status: 'open',
      memo: invoiceInput.memo ?? null,
      metadata,
    }
  })

  const {
    data: insertedInvoices,
    error: invoiceError,
  } = await supabase
    .from('invoices' as any)
    .insert(invoicesPayload)
    .select('*')

  if (invoiceError) {
    return Response.json(
      { error: 'Unable to create invoices.' },
      { status: 500 },
    )
  }

  if (lineItems.length && insertedInvoices?.length) {
    const flattenedLineItems: InvoiceLineItemInsertPayload[] = insertedInvoices.flatMap(
      (invoice, index) => {
        const perMemberLineItems = invoiceLineItemsByMember[index] ?? []

        return perMemberLineItems.map((lineItem) => ({
          invoice_id: (invoice as { id: string | number }).id,
          description: lineItem.description,
          amount: lineItem.amount,
          quantity: lineItem.quantity,
        }))
      },
    )

    if (flattenedLineItems.length) {
      const { error: lineItemsError } = await supabase
        .from('invoice_line_items' as any)
        .insert(flattenedLineItems)

      if (lineItemsError) {
        return Response.json(
          {
            error: 'Invoices were created but line items failed to persist.',
          },
          { status: 500 },
        )
      }
    }
  }

  return Response.json(
    { invoices: insertedInvoices ?? [] },
    { status: 201 },
  )
}

function allocateByShares(total: number, weights: number[]): number[] {
  const sanitizedWeights = weights.map((weight) => Math.max(weight, 0))
  const totalShare = sanitizedWeights.reduce((sum, share) => sum + share, 0)

  if (total <= 0) {
    return sanitizedWeights.map(() => 0)
  }

  if (totalShare <= 0) {
    throw new Error('Allocation requires at least one positive share weight.')
  }

  const totalCents = Math.round(total * 100)
  let allocatedCents = 0

  return sanitizedWeights.map((weight, index) => {
    if (index === sanitizedWeights.length - 1) {
      const remaining = Math.max(totalCents - allocatedCents, 0)
      return centsToCurrency(remaining)
    }

    const ratio = weight / totalShare
    const cents = Math.round(totalCents * ratio)
    allocatedCents += cents

    return centsToCurrency(cents)
  })
}

function centsToCurrency(cents: number) {
  return Number((cents / 100).toFixed(2))
}

function computeLateFeeTotal(lateFee: LateFeeConfig, totalAmount: number) {
  if (!lateFee) {
    return 0
  }

  let calculated = 0

  if (lateFee.flatAmount !== undefined) {
    calculated = lateFee.flatAmount
  } else if (lateFee.percentage !== undefined) {
    calculated = (totalAmount * lateFee.percentage) / 100
  }

  if (lateFee.maximumAmount !== undefined) {
    calculated = Math.min(calculated, lateFee.maximumAmount)
  }

  return Number(calculated.toFixed(2))
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}
