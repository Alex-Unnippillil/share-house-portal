import { makeExecutableSchema } from "@graphql-tools/schema"
import type { GraphQLSchema } from "graphql"

import { resolvers as bookingResolvers, typeDefs as bookingTypeDefs } from "./bookings"
import { resolvers as paymentResolvers, typeDefs as paymentTypeDefs } from "./payments"

const baseTypeDefs = /* GraphQL */ `
  type Query {
    _empty: Boolean
  }

  type Profile {
    id: ID!
    fullName: String
    email: String
    role: String
    avatarUrl: String
  }
`

const baseResolvers = {
  Query: {
    _empty: () => true,
  },
  Profile: {
    fullName: (profile: { full_name?: string | null }) => profile.full_name ?? null,
    avatarUrl: (profile: { avatar_url?: string | null }) => profile.avatar_url ?? null,
  },
}

export const schema: GraphQLSchema = makeExecutableSchema({
  typeDefs: [baseTypeDefs, paymentTypeDefs, bookingTypeDefs],
  resolvers: [baseResolvers, paymentResolvers, bookingResolvers],
})
