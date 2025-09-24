import type { Database } from "@/lib/supabase"

import type { GraphQLContext } from "../context"

type PaymentRow = Database["public"]["Tables"]["rent_payments"]["Row"]

type PaymentStatus = PaymentRow["status"]

type PaymentSummary = {
  totalCount: number
  totalAmount: number
  byStatus: Array<{ status: PaymentStatus; count: number; amount: number }>
}

type PaymentArgs = {
  tenantId?: string | null
  status?: PaymentStatus
  limit?: number | null
}

export const typeDefs = /* GraphQL */ `
  extend type Query {
    payments(tenantId: ID, status: String, limit: Int = 20): [Payment!]!
    paymentSummary(tenantId: ID): PaymentSummary!
  }

  type Payment {
    id: ID!
    amount: Float!
    currency: String!
    status: String!
    description: String
    processedAt: String
    billingPeriodStart: String
    billingPeriodEnd: String
    tenant: Profile
  }

  type PaymentSummary {
    totalCount: Int!
    totalAmount: Float!
    byStatus: [PaymentStatusGroup!]!
  }

  type PaymentStatusGroup {
    status: String!
    count: Int!
    amount: Float!
  }
`

export const resolvers = {
  Query: {
    payments: async (_: unknown, args: PaymentArgs, ctx: GraphQLContext) => {
      const { tenantId, status, limit = 20 } = args
      let query = ctx.supabase
        .from("rent_payments")
        .select("*")
        .order("processed_at", { ascending: false })

      if (tenantId) {
        query = query.eq("tenant_id", tenantId)
      }

      if (status) {
        query = query.eq("status", status)
      }

      const result = await query.limit(limit)

      if (result.error) {
        throw new Error(`Failed to load payments: ${result.error.message}`)
      }

      return result.data ?? []
    },
    paymentSummary: async (
      _: unknown,
      args: { tenantId?: string | null },
      ctx: GraphQLContext
    ): Promise<PaymentSummary> => {
      let query = ctx.supabase
        .from("rent_payments")
        .select("status, amount, tenant_id")

      if (args.tenantId) {
        query = query.eq("tenant_id", args.tenantId)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to summarise payments: ${error.message}`)
      }

      const rows = data ?? []
      const statusMap = new Map<PaymentStatus, { count: number; amount: number }>()
      let totalAmount = 0

      for (const payment of rows) {
        const status = payment.status as PaymentStatus
        const entry = statusMap.get(status) ?? { count: 0, amount: 0 }
        entry.count += 1
        entry.amount += payment.amount ?? 0
        totalAmount += payment.amount ?? 0
        statusMap.set(status, entry)
      }

      return {
        totalCount: rows.length,
        totalAmount,
        byStatus: Array.from(statusMap.entries()).map(([status, value]) => ({
          status,
          count: value.count,
          amount: value.amount,
        })),
      }
    },
  },
  Payment: {
    processedAt: (payment: PaymentRow) => payment.processed_at,
    billingPeriodStart: (payment: PaymentRow) => payment.billing_period_start,
    billingPeriodEnd: (payment: PaymentRow) => payment.billing_period_end,
    tenant: async (payment: PaymentRow, _args: unknown, ctx: GraphQLContext) => {
      const tenantId = payment.tenant_id ?? payment.user_id

      if (!tenantId) {
        return null
      }

      return ctx.loaders.profileById.load(tenantId)
    },
  },
}
