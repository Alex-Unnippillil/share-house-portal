import type { ExecutionResult } from "graphql"
import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it, vi } from "vitest"
import { processRequest } from "graphql-helix"

import { createGraphQLContext } from "@/app/api/graphql/context"
import { schema } from "@/app/api/graphql/schema"
import type { Database } from "@/lib/supabase"

type RowMap = {
  rent_payments: Database["public"]["Tables"]["rent_payments"]["Row"][]
  profiles: Database["public"]["Tables"]["profiles"]["Row"][]
  amenity_bookings: Database["public"]["Tables"]["amenity_bookings"]["Row"][]
}

type MockBuilder<T> = {
  select: (columns?: string) => MockBuilder<T>
  eq: (column: keyof T, value: unknown) => MockBuilder<T>
  in: (column: keyof T, values: readonly string[]) => MockBuilder<T>
  order: (column: keyof T, options?: { ascending?: boolean }) => MockBuilder<T>
  limit: (value: number) => MockBuilder<T>
  then: <TResult = { data: T[]; error: null }>(
    onfulfilled?: (value: { data: T[]; error: null }) => TResult,
    onrejected?: (reason: unknown) => TResult
  ) => Promise<TResult>
}

function createQueryBuilder<T extends Record<string, any>>(rows: T[]): MockBuilder<T> {
  let result = [...rows]

  const builder: Partial<MockBuilder<T>> = {
    select() {
      return builder as MockBuilder<T>
    },
    eq(column, value) {
      result = result.filter((row) => row[column] === value)
      return builder as MockBuilder<T>
    },
    in(column, values) {
      const set = new Set(values)
      result = result.filter((row) => set.has(row[column] as unknown as string))
      return builder as MockBuilder<T>
    },
    order(column, options) {
      const ascending = options?.ascending ?? true
      result = [...result].sort((a, b) => {
        const left = a[column]
        const right = b[column]
        if (left === right) return 0
        return left > right ? (ascending ? 1 : -1) : ascending ? -1 : 1
      })
      return builder as MockBuilder<T>
    },
    limit(value) {
      result = result.slice(0, value)
      return builder as MockBuilder<T>
    },
    then(onfulfilled, onrejected) {
      return Promise.resolve({ data: result, error: null }).then(
        onfulfilled,
        onrejected
      )
    },
  }

  return builder as MockBuilder<T>
}

function createMockSupabase(data: RowMap) {
  const from = vi.fn(<TKey extends keyof RowMap>(table: TKey) =>
    createQueryBuilder(data[table] as RowMap[TKey])
  )

  const client = { from } as unknown as SupabaseClient<Database>

  return { client, from }
}

async function executeGraphQL(
  mock: ReturnType<typeof createMockSupabase>,
  query: string,
  variables?: Record<string, unknown>
) {
  const result = await processRequest({
    operationName: null,
    query,
    variables,
    request: {
      body: { query, variables },
      headers: {},
      method: "POST",
      query: {},
    },
    schema,
    contextFactory: () => createGraphQLContext(mock.client),
  })

  if (result.type !== "RESPONSE") {
    throw new Error(`Unexpected response type: ${result.type}`)
  }

  return result.payload as ExecutionResult
}

describe("GraphQL aggregations", () => {
  it("returns payments and summary data with batched profile lookups", async () => {
    const data: RowMap = {
      profiles: [
        {
          id: "tenant-1",
          created_at: null,
          updated_at: null,
          email: "tenant1@example.com",
          full_name: "Tenant One",
          username: null,
          website: null,
          avatar_url: null,
          role: "tenant",
          unit_id: "unit-a",
          phone: null,
          language: null,
          stripe_customer_id: "cus_123",
          rent_share: 1200,
          metadata: null,
        },
        {
          id: "tenant-2",
          created_at: null,
          updated_at: null,
          email: "tenant2@example.com",
          full_name: "Tenant Two",
          username: null,
          website: null,
          avatar_url: null,
          role: "tenant",
          unit_id: "unit-a",
          phone: null,
          language: null,
          stripe_customer_id: "cus_789",
          rent_share: 1000,
          metadata: null,
        },
      ],
      rent_payments: [
        {
          id: "pay-1",
          user_id: "tenant-1",
          stripe_payment_intent_id: null,
          stripe_charge_id: null,
          stripe_customer_id: "cus_123",
          stripe_subscription_id: null,
          amount: 1200,
          currency: "usd",
          status: "succeeded",
          payment_method: null,
          payment_method_type: null,
          description: "January rent",
          receipt_url: null,
          metadata: null,
          payer_name: "Tenant One",
          tenant_id: "tenant-1",
          unit: null,
          unit_id: "unit-a",
          processed_at: "2024-01-02T12:00:00.000Z",
          billing_period_start: "2024-01-01",
          billing_period_end: "2024-01-31",
          created_at: "2024-01-02T12:00:00.000Z",
          updated_at: "2024-01-02T12:00:00.000Z",
        },
        {
          id: "pay-2",
          user_id: "tenant-1",
          stripe_payment_intent_id: null,
          stripe_charge_id: null,
          stripe_customer_id: "cus_123",
          stripe_subscription_id: null,
          amount: 1180,
          currency: "usd",
          status: "pending",
          payment_method: null,
          payment_method_type: null,
          description: "February rent",
          receipt_url: null,
          metadata: null,
          payer_name: "Tenant One",
          tenant_id: "tenant-1",
          unit: null,
          unit_id: "unit-a",
          processed_at: "2024-02-01T12:00:00.000Z",
          billing_period_start: "2024-02-01",
          billing_period_end: "2024-02-29",
          created_at: "2024-02-01T12:00:00.000Z",
          updated_at: "2024-02-01T12:00:00.000Z",
        },
        {
          id: "pay-3",
          user_id: "tenant-2",
          stripe_payment_intent_id: null,
          stripe_charge_id: null,
          stripe_customer_id: "cus_789",
          stripe_subscription_id: null,
          amount: 1000,
          currency: "usd",
          status: "succeeded",
          payment_method: null,
          payment_method_type: null,
          description: "January rent",
          receipt_url: null,
          metadata: null,
          payer_name: "Tenant Two",
          tenant_id: "tenant-2",
          unit: null,
          unit_id: "unit-a",
          processed_at: "2024-01-03T12:00:00.000Z",
          billing_period_start: "2024-01-01",
          billing_period_end: "2024-01-31",
          created_at: "2024-01-03T12:00:00.000Z",
          updated_at: "2024-01-03T12:00:00.000Z",
        },
      ],
      amenity_bookings: [],
    }

    const mock = createMockSupabase(data)
    const query = /* GraphQL */ `
      query Payments($tenantId: ID) {
        payments(tenantId: $tenantId) {
          id
          amount
          status
          tenant {
            id
            fullName
            email
          }
        }
        paymentSummary(tenantId: $tenantId) {
          totalCount
          totalAmount
          byStatus {
            status
            count
            amount
          }
        }
      }
    `

    const result = await executeGraphQL(mock, query, {
      tenantId: "tenant-1",
    })

    expect(result.errors).toBeUndefined()
    expect(result.data?.payments).toHaveLength(2)
    expect(result.data?.payments?.[0].tenant.fullName).toBe("Tenant One")
    expect(result.data?.paymentSummary).toMatchObject({
      totalCount: 2,
      totalAmount: 2380,
    })
    expect(result.data?.paymentSummary.byStatus).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "succeeded", count: 1, amount: 1200 }),
        expect.objectContaining({ status: "pending", count: 1, amount: 1180 }),
      ])
    )

    const profileLookups = mock.from.mock.calls.filter(
      ([table]) => table === "profiles"
    )
    expect(profileLookups).toHaveLength(1)
  })

  it("aggregates bookings with profile batching and upcoming windows", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-05-01T00:00:00.000Z"))

    const data: RowMap = {
      profiles: [
        {
          id: "tenant-1",
          created_at: null,
          updated_at: null,
          email: "tenant1@example.com",
          full_name: "Tenant One",
          username: null,
          website: null,
          avatar_url: null,
          role: "tenant",
          unit_id: "unit-a",
          phone: null,
          language: null,
          stripe_customer_id: "cus_123",
          rent_share: 1200,
          metadata: null,
        },
      ],
      rent_payments: [],
      amenity_bookings: [
        {
          id: "booking-1",
          amenity_id: "gym",
          household_id: "house-1",
          created_by: "tenant-1",
          status: "confirmed",
          start_time: "2024-05-02T10:00:00.000Z",
          end_time: "2024-05-02T11:00:00.000Z",
          created_at: "2024-04-25T09:00:00.000Z",
          updated_at: "2024-04-25T09:00:00.000Z",
          metadata: null,
        },
        {
          id: "booking-2",
          amenity_id: "gym",
          household_id: "house-1",
          created_by: "tenant-1",
          status: "pending",
          start_time: "2024-04-01T10:00:00.000Z",
          end_time: "2024-04-01T11:00:00.000Z",
          created_at: "2024-03-20T09:00:00.000Z",
          updated_at: "2024-03-20T09:00:00.000Z",
          metadata: null,
        },
        {
          id: "booking-3",
          amenity_id: "gym",
          household_id: "house-1",
          created_by: "tenant-1",
          status: "confirmed",
          start_time: "2024-06-01T10:00:00.000Z",
          end_time: "2024-06-01T11:00:00.000Z",
          created_at: "2024-04-28T09:00:00.000Z",
          updated_at: "2024-04-28T09:00:00.000Z",
          metadata: null,
        },
      ],
    }

    const mock = createMockSupabase(data)
    const query = /* GraphQL */ `
      query Bookings($amenityId: ID) {
        bookings(amenityId: $amenityId) {
          id
          status
          startTime
          createdBy {
            id
            fullName
          }
        }
        bookingSummary(amenityId: $amenityId, upcomingLimit: 2) {
          totalCount
          byStatus {
            status
            count
          }
          upcoming {
            id
            startTime
            createdBy {
              id
            }
          }
        }
      }
    `

    const result = await executeGraphQL(mock, query, {
      amenityId: "gym",
    })

    expect(result.errors).toBeUndefined()
    expect(result.data?.bookings).toHaveLength(3)
    expect(result.data?.bookingSummary.totalCount).toBe(3)
    expect(result.data?.bookingSummary.byStatus).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "confirmed", count: 2 }),
        expect.objectContaining({ status: "pending", count: 1 }),
      ])
    )
    expect(result.data?.bookingSummary.upcoming).toHaveLength(2)
    expect(result.data?.bookingSummary.upcoming?.[0].id).toBe("booking-1")
    expect(result.data?.bookingSummary.upcoming?.[1].id).toBe("booking-3")

    const profileLookups = mock.from.mock.calls.filter(
      ([table]) => table === "profiles"
    )
    expect(profileLookups).toHaveLength(1)

    vi.useRealTimers()
  })
})
