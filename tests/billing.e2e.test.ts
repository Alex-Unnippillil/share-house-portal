import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/utils/supaone", () => ({
  createSupbaseServerClient: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

const { createSupbaseServerClient } = await import("@/utils/supaone")
const { revalidatePath } = await import("next/cache")
const { applyInvoiceAdjustment } = await import("@/app/(admin)/billing/actions")

const createSupbaseServerClientMock = createSupbaseServerClient as unknown as vi.Mock

type StubOptions = {
  invoice?: {
    id?: string
    balance_cents: number
    currency?: string
  }
  profileRole?: string
}

function createSupabaseStub(options: StubOptions = {}) {
  const invoiceId = options.invoice?.id ?? "11111111-1111-4111-8111-111111111111"
  const invoiceRow = {
    id: invoiceId,
    balance_cents: options.invoice?.balance_cents ?? 125_00,
    currency: options.invoice?.currency ?? "USD",
  }

  const adjustments: any[] = []
  const events: any[] = []
  const invoiceUpdates: any[] = []

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-user" } }, error: null }),
    },
    from: vi.fn((table: string) => {
      switch (table) {
        case "profiles":
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi
              .fn()
              .mockResolvedValue({ data: { id: "admin-user", role: options.profileRole ?? "admin" }, error: null }),
          }
        case "invoices":
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { ...invoiceRow }, error: null }),
            update: vi.fn((values: any) => {
              invoiceUpdates.push(values)
              invoiceRow.balance_cents = values.balance_cents
              return {
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
              }
            }),
          }
        case "invoice_adjustments":
          return {
            insert: vi.fn((values: any) => {
              adjustments.push(values)
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: `adjustment-${adjustments.length}`,
                      created_at: new Date().toISOString(),
                      ...values,
                    },
                    error: null,
                  }),
                }),
              }
            }),
          }
        case "events":
          return {
            insert: vi.fn((value: any) => {
              events.push(value)
              return Promise.resolve({ data: [{ id: `event-${events.length}`, ...value }], error: null })
            }),
          }
        default:
          throw new Error(`Unexpected table: ${table}`)
      }
    }),
    insertCalls: { adjustments, events },
    invoiceUpdates,
    invoiceRow,
  }
}

describe("applyInvoiceAdjustment", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createSupbaseServerClientMock.mockReset()
    ;(revalidatePath as unknown as vi.Mock).mockReset()
  })

  it("creates a credit adjustment and decreases the balance", async () => {
    const supabase = createSupabaseStub({ invoice: { balance_cents: 120_00 } })
    createSupbaseServerClientMock.mockResolvedValue(supabase)

    const result = await applyInvoiceAdjustment({
      invoiceId: supabase.invoiceRow.id,
      amount: 50,
      reason: "Appliance refund",
      type: "credit",
      memo: "Approved by property manager",
    })

    expect(result.invoice.balance_cents).toBe(70_00)
    expect(supabase.insertCalls.adjustments[0]).toMatchObject({
      invoice_id: supabase.invoiceRow.id,
      amount_cents: -5000,
      reason: "Appliance refund",
      type: "credit",
    })
    expect(supabase.invoiceUpdates[0]).toMatchObject({ balance_cents: 70_00 })
    expect(supabase.insertCalls.events[0]).toMatchObject({
      event_type: "billing.invoice.adjustment",
      resource_id: supabase.invoiceRow.id,
      payload: expect.objectContaining({
        amount_cents: -5000,
        previous_balance_cents: 120_00,
        next_balance_cents: 70_00,
        type: "credit",
      }),
    })
    expect(revalidatePath).toHaveBeenCalledWith("/payments")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/billing")
  })

  it("records a reversal that restores the outstanding balance", async () => {
    const supabase = createSupabaseStub({ invoice: { balance_cents: 32_00 } })
    createSupbaseServerClientMock.mockResolvedValue(supabase)

    const result = await applyInvoiceAdjustment({
      invoiceId: supabase.invoiceRow.id,
      amount: 15.5,
      reason: "Reversed roommate credit",
      type: "reversal",
    })

    expect(result.invoice.balance_cents).toBe(47_50)
    expect(supabase.insertCalls.adjustments[0]).toMatchObject({
      amount_cents: 1550,
      type: "reversal",
    })
    expect(supabase.insertCalls.events[0].payload).toMatchObject({
      amount_cents: 1550,
      previous_balance_cents: 32_00,
      next_balance_cents: 47_50,
      type: "reversal",
    })
  })
})
