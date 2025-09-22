import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabaseServer', () => ({
  default: vi.fn(),
}))

import createSupabaseServerClient from '@/lib/supabaseServer'
import { POST } from '@/app/api/billing/create-invoice/route'

type SupabaseStubConfig = {
  userId?: string
  membershipData?: Array<{ profile_id: string; rent_share: number | null }>
  membershipError?: { message: string } | null
  insertedInvoices?: Array<Record<string, unknown>>
  invoiceInsertError?: { message: string } | null
  lineItemsError?: { message: string } | null
}

type SupabaseStub = {
  supabase: {
    auth: {
      getUser: ReturnType<typeof vi.fn>
    }
    from: ReturnType<typeof vi.fn>
  }
  spies: {
    membershipSelect: ReturnType<typeof vi.fn>
    membershipEq: ReturnType<typeof vi.fn>
    invoiceInsert: ReturnType<typeof vi.fn>
    invoiceSelect: ReturnType<typeof vi.fn>
    invoiceLineItemsInsert: ReturnType<typeof vi.fn>
    from: ReturnType<typeof vi.fn>
    getUser: ReturnType<typeof vi.fn>
  }
  insertedInvoices: Array<Record<string, unknown>>
}

type SupabaseMock = SupabaseStub['supabase']

function createSupabaseStub(config: SupabaseStubConfig = {}): SupabaseStub {
  const membershipResponse = {
    data: config.membershipData ?? [],
    error: config.membershipError ?? null,
  }

  const insertedInvoices = config.insertedInvoices ?? []

  const membershipEq = vi.fn().mockResolvedValue(membershipResponse)
  const membershipSelect = vi.fn().mockReturnValue({ eq: membershipEq })
  const invoiceSelect = vi
    .fn()
    .mockResolvedValue({ data: insertedInvoices, error: config.invoiceInsertError ?? null })
  const invoiceInsert = vi.fn().mockReturnValue({ select: invoiceSelect })
  const invoiceLineItemsInsert = vi
    .fn()
    .mockResolvedValue({ data: null, error: config.lineItemsError ?? null })

  const from = vi.fn((table: string) => {
    if (table === 'household_members') {
      return { select: membershipSelect }
    }

    if (table === 'invoices') {
      return { insert: invoiceInsert }
    }

    if (table === 'invoice_line_items') {
      return { insert: invoiceLineItemsInsert }
    }

    throw new Error(`Unexpected table requested in mock: ${table}`)
  })

  const getUser = vi.fn().mockResolvedValue({
    data: { user: { id: config.userId ?? 'user-123' } },
    error: null,
  })

  const supabase = {
    auth: {
      getUser,
    },
    from,
  }

  return {
    supabase,
    spies: {
      membershipSelect,
      membershipEq,
      invoiceInsert,
      invoiceSelect,
      invoiceLineItemsInsert,
      from,
      getUser,
    },
    insertedInvoices,
  }
}

describe('POST /api/billing/create-invoice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates invoices for each household member', async () => {
    const stub = createSupabaseStub({
      membershipData: [
        { profile_id: 'user-123', rent_share: 60 },
        { profile_id: 'user-456', rent_share: 40 },
      ],
      insertedInvoices: [{ id: 'inv-1' }, { id: 'inv-2' }],
    })

    vi.mocked(createSupabaseServerClient).mockReturnValue(stub.supabase as SupabaseMock)

    const payload = {
      householdId: 'household-1',
      billingPeriod: { start: '2024-06-01', end: '2024-06-30' },
      dueDate: '2024-07-05',
      totalAmount: 2000,
    }

    const request = new Request('http://localhost/api/billing/create-invoice', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    const response = await POST(request)
    const responseBody = await response.json()

    expect(response.status).toBe(201)
    expect(responseBody.invoices).toEqual(stub.insertedInvoices)

    expect(stub.spies.invoiceInsert).toHaveBeenCalledTimes(1)
    const insertedPayload = stub.spies.invoiceInsert.mock.calls[0][0] as Array<
      Record<string, any>
    >

    expect(insertedPayload).toHaveLength(2)
    expect(insertedPayload[0]).toMatchObject({
      household_id: 'household-1',
      resident_id: 'user-123',
      amount_due: 1200,
      status: 'open',
    })
    expect(insertedPayload[0].metadata?.rentShare).toBeCloseTo(0.6)
    expect(insertedPayload[1]).toMatchObject({
      household_id: 'household-1',
      resident_id: 'user-456',
      amount_due: 800,
      status: 'open',
    })
    expect(insertedPayload[1].metadata?.rentShare).toBeCloseTo(0.4)
    expect(insertedPayload[0].metadata?.lineItems).toBeUndefined()

    expect(stub.spies.invoiceLineItemsInsert).not.toHaveBeenCalled()
  })

  it('rejects callers that are not household members', async () => {
    const stub = createSupabaseStub({
      membershipData: [{ profile_id: 'another-user', rent_share: 100 }],
    })

    vi.mocked(createSupabaseServerClient).mockReturnValue(stub.supabase as SupabaseMock)

    const payload = {
      householdId: 'household-2',
      billingPeriod: { start: '2024-06-01', end: '2024-06-30' },
      dueDate: '2024-07-05',
      totalAmount: 1500,
    }

    const request = new Request('http://localhost/api/billing/create-invoice', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toMatch(/do not have permission/i)
    expect(stub.spies.invoiceInsert).not.toHaveBeenCalled()
  })

  it('calculates late fee metadata and line items for each tenant', async () => {
    const stub = createSupabaseStub({
      membershipData: [
        { profile_id: 'user-123', rent_share: 70 },
        { profile_id: 'user-789', rent_share: 30 },
      ],
      insertedInvoices: [{ id: 'inv-1' }, { id: 'inv-2' }],
    })

    vi.mocked(createSupabaseServerClient).mockReturnValue(stub.supabase as SupabaseMock)

    const payload = {
      householdId: 'household-3',
      billingPeriod: { start: '2024-06-01', end: '2024-06-30' },
      dueDate: '2024-07-05',
      totalAmount: 2500.5,
      lineItems: [
        { description: 'Base rent', amount: 2200, quantity: 1 },
        { description: 'Utilities', amount: 300.5, quantity: 1 },
      ],
      lateFee: {
        percentage: 8,
        gracePeriodDays: 3,
        maximumAmount: 150,
      },
    }

    const request = new Request('http://localhost/api/billing/create-invoice', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    const response = await POST(request)
    const responseJson = await response.json()

    expect(response.status).toBe(201)
    expect(responseJson.invoices).toEqual(stub.insertedInvoices)

    const insertedPayload = stub.spies.invoiceInsert.mock.calls[0][0] as Array<
      Record<string, any>
    >
    expect(insertedPayload).toHaveLength(2)

    const firstMetadata = insertedPayload[0].metadata
    const secondMetadata = insertedPayload[1].metadata

    expect(firstMetadata?.lateFee).toMatchObject({ amount: 105, scheduleDate: '2024-07-08T00:00:00.000Z' })
    expect(secondMetadata?.lateFee).toMatchObject({ amount: 45, scheduleDate: '2024-07-08T00:00:00.000Z' })

    expect(firstMetadata?.lineItems).toEqual([
      { description: 'Base rent', amount: 1540, quantity: 1 },
      { description: 'Utilities', amount: 210.35, quantity: 1 },
    ])
    expect(secondMetadata?.lineItems).toEqual([
      { description: 'Base rent', amount: 660, quantity: 1 },
      { description: 'Utilities', amount: 90.15, quantity: 1 },
    ])

    expect(stub.spies.invoiceLineItemsInsert).toHaveBeenCalledTimes(1)
    const lineItemPayload = stub.spies.invoiceLineItemsInsert.mock.calls[0][0] as Array<
      Record<string, any>
    >

    expect(lineItemPayload).toEqual([
      { invoice_id: 'inv-1', description: 'Base rent', amount: 1540, quantity: 1 },
      { invoice_id: 'inv-1', description: 'Utilities', amount: 210.35, quantity: 1 },
      { invoice_id: 'inv-2', description: 'Base rent', amount: 660, quantity: 1 },
      { invoice_id: 'inv-2', description: 'Utilities', amount: 90.15, quantity: 1 },
    ])
  })
})
