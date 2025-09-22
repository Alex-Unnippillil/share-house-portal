export type InvitePrefetchContext = {
  inviteToken: string
  inviteeEmail: string
  invitedByName: string | null
  notes: string | null
  inviteMetadata: Record<string, unknown> | null
  unit: {
    id: string
    label: string
    bedrooms: number | null
    bathrooms: number | null
    floorArea: number | null
    rent: number | null
    currency: string | null
    availableFrom: string | null
    metadata: Record<string, unknown> | null
  }
  property: {
    id: string
    name: string
    addressLine1: string
    addressLine2: string | null
    city: string
    state: string | null
    postalCode: string | null
    country: string
    timezone: string | null
    amenities: string[]
    metadata: Record<string, unknown> | null
  }
  serverRenderedAt: number
}
