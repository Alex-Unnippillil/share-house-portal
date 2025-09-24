import type { Database } from "@/lib/supabase"

import type { GraphQLContext } from "../context"

type BookingRow = Database["public"]["Tables"]["amenity_bookings"]["Row"]

type BookingStatus = BookingRow["status"]

type BookingArgs = {
  amenityId?: string | null
  status?: BookingStatus
  limit?: number | null
}

type BookingSummaryResult = {
  totalCount: number
  byStatus: Array<{ status: BookingStatus; count: number }>
  upcoming: BookingRow[]
}

export const typeDefs = /* GraphQL */ `
  extend type Query {
    bookings(amenityId: ID, status: String, limit: Int = 20): [Booking!]!
    bookingSummary(amenityId: ID, upcomingLimit: Int = 3): BookingSummary!
  }

  type Booking {
    id: ID!
    amenityId: String!
    householdId: String
    status: String!
    startTime: String!
    endTime: String!
    createdAt: String
    updatedAt: String
    createdBy: Profile
  }

  type BookingSummary {
    totalCount: Int!
    byStatus: [BookingStatusGroup!]!
    upcoming: [Booking!]!
  }

  type BookingStatusGroup {
    status: String!
    count: Int!
  }
`

export const resolvers = {
  Query: {
    bookings: async (_: unknown, args: BookingArgs, ctx: GraphQLContext) => {
      const { amenityId, status, limit = 20 } = args
      let query = ctx.supabase
        .from("amenity_bookings")
        .select("*")
        .order("start_time", { ascending: true })

      if (amenityId) {
        query = query.eq("amenity_id", amenityId)
      }

      if (status) {
        query = query.eq("status", status)
      }

      const result = await query.limit(limit)

      if (result.error) {
        throw new Error(`Failed to load bookings: ${result.error.message}`)
      }

      return result.data ?? []
    },
    bookingSummary: async (
      _: unknown,
      args: { amenityId?: string | null; upcomingLimit?: number | null },
      ctx: GraphQLContext
    ): Promise<BookingSummaryResult> => {
      const { amenityId, upcomingLimit = 3 } = args
      let query = ctx.supabase
        .from("amenity_bookings")
        .select("*")

      if (amenityId) {
        query = query.eq("amenity_id", amenityId)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to summarise bookings: ${error.message}`)
      }

      const bookings = (data ?? []) as BookingRow[]
      const statusCounts = new Map<BookingStatus, number>()

      for (const booking of bookings) {
        const status = booking.status as BookingStatus
        statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1)
      }

      const now = new Date()
      const upcoming = bookings
        .filter((booking) => new Date(booking.start_time) >= now)
        .sort(
          (a, b) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        )
        .slice(0, upcomingLimit)

      return {
        totalCount: bookings.length,
        byStatus: Array.from(statusCounts.entries()).map(([status, count]) => ({
          status,
          count,
        })),
        upcoming,
      }
    },
  },
  Booking: {
    amenityId: (booking: BookingRow) => booking.amenity_id,
    householdId: (booking: BookingRow) => booking.household_id,
    startTime: (booking: BookingRow) => booking.start_time,
    endTime: (booking: BookingRow) => booking.end_time,
    createdAt: (booking: BookingRow) => booking.created_at,
    updatedAt: (booking: BookingRow) => booking.updated_at,
    createdBy: async (booking: BookingRow, _args: unknown, ctx: GraphQLContext) => {
      if (!booking.created_by) {
        return null
      }

      return ctx.loaders.profileById.load(booking.created_by)
    },
  },
}
